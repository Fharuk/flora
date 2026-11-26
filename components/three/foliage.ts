import * as THREE from "three";

import { makeRandom } from "@/lib/bouquet";
import type { FoliageArchetype, FoliageSpray } from "@/lib/foliage";

import { mergeAll, paintFlat, paintGradient, taperedTube } from "./flowers/geometry";

/**
 * Foliage → geometry.
 *
 * Greenery is the counterweight to the glass flowers: matte, dark, cheap by design, so
 * the blooms have something to be brighter than. Every blade is generated here, so a
 * spray costs no download and resolves at any distance.
 *
 * Each spray is generated in world space already (its stem is a bowed curve from the
 * vessel mouth), and the leaves are placed by sampling that same curve — never by an
 * approximation — so a leaf always sits exactly on its stem.
 */

const UP = new THREE.Vector3(0, 1, 0);

function sprayCurve(spray: FoliageSpray): THREE.CatmullRomCurve3 {
  const origin = new THREE.Vector3(...spray.origin);
  const dir = new THREE.Vector3(
    Math.cos(spray.azimuth) * Math.sin(spray.lean),
    Math.cos(spray.lean),
    Math.sin(spray.azimuth) * Math.sin(spray.lean)
  );
  const tip = origin.clone().addScaledVector(dir, spray.length);
  const mid = origin
    .clone()
    .add(tip)
    .multiplyScalar(0.5)
    .add(
      new THREE.Vector3(
        Math.sin(spray.azimuth + Math.PI / 2) * spray.bow * 0.16,
        // foliage droops: an arching spray sags in the middle
        -Math.abs(spray.bow) * 0.05,
        Math.cos(spray.azimuth + Math.PI / 2) * spray.bow * 0.16
      )
    );
  return new THREE.CatmullRomCurve3([origin, mid, tip]);
}

/* ---------------------------------------------------------------------- leaf */

/**
 * A leaf blade.
 *
 * Not a petal: the width laws are different, the cross-section is nearly flat, and the
 * silhouette has to hold up at the small end of a spray where a petal would dissolve
 * into a smear.
 */
function leafGeometry(
  shape: FoliageArchetype["shape"],
  length: number,
  width: number,
  curve: number
): THREE.BufferGeometry {
  // baby's breath is not a leaf at all — it is a bead of glass on a thread
  if (shape === "bead") {
    return new THREE.SphereGeometry(length, 7, 5);
  }

  const segmentsU = shape === "pinna" ? 4 : 7;
  const segmentsV = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const profile = (u: number): number => {
    switch (shape) {
      // long and narrow, widest a third of the way up
      case "lance":
        return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.62) * (1 - u * 0.1);
      // a near-circle, then a short point
      case "coin":
        return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.55)), 0.42);
      // widest at the base, tapering — ruscus is all spine
      case "blade":
        return Math.pow(1 - u, 0.55) * (0.55 + 0.45 * Math.sin(Math.PI * u * 0.9));
      // a small strap that stays broad then tapers — a fern pinna
      case "pinna":
      default:
        return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.9)), 0.3) * (1 - u * 0.25);
    }
  };

  for (let iu = 0; iu <= segmentsU; iu++) {
    const u = iu / segmentsU;
    const halfW = (width * 0.5) * profile(u);
    for (let iv = 0; iv <= segmentsV; iv++) {
      const v = (iv / segmentsV) * 2 - 1;
      const x = v * halfW;
      const y = u * length;
      // a shallow cup across the blade plus a droop along it; a real leaf is never a card
      const z = (1 - Math.abs(v)) * 0.012 + curve * u * u * length * 0.14;
      positions.push(x, y, z);
      uvs.push(v * 0.5 + 0.5, u);
    }
  }

  const row = segmentsV + 1;
  for (let iu = 0; iu < segmentsU; iu++) {
    for (let iv = 0; iv < segmentsV; iv++) {
      const a = iu * row + iv;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  // a leaf is nearly flat: face the whole blade one way so the midrib reads as a ridge
  geo.computeVertexNormals();
  return geo;
}

/* --------------------------------------------------------------------- spray */

export type FoliageGeometry = {
  /** every stem, merged, in bouquet space */
  stems: THREE.BufferGeometry;
  /** every blade, merged, in bouquet space */
  leaves: THREE.BufferGeometry;
};

/**
 * Build the greenery for a whole bouquet.
 *
 * Two buffers, not one, so the scene can give the stems a waxy material and the blades
 * a matte one — without paying a draw call per spray.
 */
export function buildFoliage(
  sprays: FoliageSpray[],
  archetype: FoliageArchetype,
  seed: number
): FoliageGeometry | null {
  if (!sprays.length) return null;

  const rand = makeRandom(seed ^ 0x1f83d9ab);
  const stemParts: THREE.BufferGeometry[] = [];
  const leafParts: THREE.BufferGeometry[] = [];

  for (const spray of sprays) {
    const curve = sprayCurve(spray);
    stemParts.push(taperedTube(curve, 0.013, { radial: 5, tubular: 14, taper: 0.5 }));

    for (const leaf of spray.leaves) {
      const t = Math.min(0.99, Math.max(0.02, leaf.t));
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();

      const blade = leafGeometry(archetype.shape, leaf.scale, leaf.scale * 0.62, 0.5);

      // the blade's +Y follows the stem, rotated about the stem by `side`
      const orient = new THREE.Quaternion().setFromUnitVectors(UP, tangent);
      const side = new THREE.Quaternion().setFromAxisAngle(tangent, leaf.side);

      // then it lifts away from the stem along an axis perpendicular to both
      const outward = new THREE.Vector3(Math.cos(spray.azimuth), 0, Math.sin(spray.azimuth));
      const liftAxis = new THREE.Vector3().crossVectors(tangent, outward);
      if (liftAxis.lengthSq() < 1e-6) liftAxis.set(0, 0, 1);
      liftAxis.normalize();
      const lift = new THREE.Quaternion().setFromAxisAngle(liftAxis, leaf.lift + (rand() - 0.5) * 0.12);

      // and rolls about its own long axis, so a spray is not a stack of flat cards
      const roll = new THREE.Quaternion().setFromAxisAngle(tangent, leaf.roll);

      blade.applyQuaternion(orient.multiply(side).multiply(lift).multiply(roll));
      blade.translate(point.x, point.y, point.z);
      leafParts.push(blade);
    }
  }

  const stems = paintFlat(mergeAll(stemParts), new THREE.Color(archetype.stem));
  const leaves = paintGradient(
    mergeAll(leafParts),
    new THREE.Color(archetype.colour[0]),
    new THREE.Color(archetype.colour[1])
  );

  return { stems, leaves };
}
