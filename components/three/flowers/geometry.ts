import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Parametric petal.
 *
 * One function covers every species in the garden: the outline is a width profile along
 * `u`, and `cup` / `curl` / `twist` bend that outline in three independent directions, so a
 * ranunculus and a gloriosa lily come out of the same six numbers.
 */

export type PetalShape = "round" | "pointed" | "heart" | "blade" | "teardrop";

export type PetalOptions = {
  length: number;
  width: number;
  /** 0 flat → 1 folded into a cup */
  cup: number;
  /** negative recurves backwards (away from the core) */
  curl: number;
  /** rotation about the petal's own long axis */
  twist: number;
  shape: PetalShape;
  /** extra ruffle along the edge */
  ruffle?: number;
  segmentsU?: number;
  segmentsV?: number;
  /** 0 → 1, scales the whole petal as it opens */
  open?: number;
};

const profile = (shape: PetalShape, u: number): number => {
  switch (shape) {
    // Profiles return the *fraction of full width* at parameter u. Fuller curves
    // (exponent < 1) read as petals; thin wedges read as leaves.
    case "pointed":
      return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.62)), 0.55) * (1 - u * 0.12);
    case "heart":
      // wide shoulders early, then a taper to a soft point
      return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.5)), 0.68) * (1 - Math.pow(u, 4) * 0.35);
    case "blade":
      return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.45);
    case "teardrop":
      return Math.pow(u, 0.32) * Math.pow(1 - u, 0.42) * 2.9;
    case "round":
    default:
      return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.42);
  }
};

export function petalGeometry({
  length,
  width,
  cup,
  curl,
  twist,
  shape,
  ruffle = 0.02,
  segmentsU = 14,
  segmentsV = 10,
  open = 1,
}: PetalOptions): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const L = length * (0.55 + 0.45 * open);

  for (let iu = 0; iu <= segmentsU; iu++) {
    const u = iu / segmentsU;
    const halfWidth = width * 0.5 * profile(shape, u) * (0.35 + 0.65 * open) * 1.55;

    for (let iv = 0; iv <= segmentsV; iv++) {
      const v = (iv / segmentsV) * 2 - 1; // -1..1 across the petal

      let x = v * halfWidth;
      let y = u * L;

      // cup: cross-section curves toward the viewer (v²)
      // smooth spherical cup rather than a V-fold
      let z = cup * halfWidth * (1.0 - Math.cos(v * Math.PI * 0.5)) * 1.25;
      // curl: the petal bends along its length
      z += curl * u * u * L * 0.42;
      // ruffle: a small travelling wave along the edge
      z += Math.sin(v * Math.PI * 2 + u * 5) * ruffle * Math.abs(v) * u * L * 0.22;
      // the very base narrows into the stem
      x *= 0.55 + 0.45 * Math.min(1, u * 4);
      y -= (1 - Math.min(1, u * 3)) * 0.03 * L;

      if (twist !== 0) {
        const a = twist * u;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const nx = x * c - z * s;
        const nz = x * s + z * c;
        x = nx;
        z = nz;
      }

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

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Tube with a radius that tapers from root to tip — used for every stem. */
export function taperedTube(
  curve: THREE.Curve<THREE.Vector3>,
  radius: number,
  { radial = 5, tubular = 16, taper = 0.45 }: { radial?: number; tubular?: number; taper?: number } = {}
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const point = new THREE.Vector3();

  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, point);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = radius * (1 - t * taper);

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const sx = Math.cos(a);
      const sy = Math.sin(a);
      positions.push(point.x + r * (sx * N.x + sy * B.x), point.y + r * (sx * N.y + sy * B.y), point.z + r * (sx * N.z + sy * B.z));
      uvs.push(j / radial, t);
    }
  }

  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** A leaf / bract — a petal with a stronger blade profile. */
export function bractGeometry(length: number, width: number, curve = 0.4): THREE.BufferGeometry {
  return petalGeometry({
    length,
    width,
    cup: 0.2,
    curl: curve,
    twist: 0.15,
    shape: "blade",
    ruffle: 0,
    segmentsU: 8,
    segmentsV: 5,
  });
}

/** Merge + free the inputs. Falls back to the first geometry if attributes disagree. */
export function mergeAll(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const cleaned = geos.map((g) => {
    const copy = g.index ? g.toNonIndexed() : g;
    // every merge participant must expose the same attribute set
    for (const key of Object.keys(copy.attributes)) {
      if (!["position", "normal", "uv"].includes(key)) copy.deleteAttribute(key);
    }
    if (!copy.getAttribute("uv")) {
      copy.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(copy.getAttribute("position").count * 2), 2));
    }
    if (!copy.getAttribute("normal")) copy.computeVertexNormals();
    copy.morphAttributes = {};
    return copy;
  });
  const merged = mergeGeometries(cleaned, false) ?? cleaned[0];
  cleaned.forEach((g) => g !== merged && g.dispose());
  geos.forEach((g) => g !== merged && !cleaned.includes(g) && g.dispose());
  merged.computeBoundingSphere();
  return merged;
}

/** Paint per-vertex colour along the petal length: base tint → tip tint. */
export function paintGradient(geo: THREE.BufferGeometry, from: THREE.Color, to: THREE.Color): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const minY = bb.min.y;
  const spanY = Math.max(0.0001, bb.max.y - minY);

  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - minY) / spanY));
    c.copy(from).lerp(to, t * t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

export function paintFlat(geo: THREE.BufferGeometry, colour: THREE.Color): THREE.BufferGeometry {
  const count = geo.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = colour.r;
    colors[i * 3 + 1] = colour.g;
    colors[i * 3 + 2] = colour.b;
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}
