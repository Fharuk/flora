import * as THREE from "three";

import type { Specimen } from "@/lib/specimens";
import type { Stem } from "@/lib/bouquet";

import { mergeAll, paintFlat, paintGradient, petalGeometry, taperedTube } from "./geometry";

/**
 * Species → geometry.
 *
 * Each builder returns one merged "head" geometry in local space (origin at the flower's
 * base, +Y up) with baked vertex colours, plus an optional accent geometry for cores and
 * spathes. The bouquet scene then instances these by transform, so a ten-stem bouquet
 * costs the same geometry memory as a single flower of each species.
 */

const SHAPE_BY_FORM: Record<Specimen["form"], "round" | "pointed" | "heart" | "blade" | "teardrop"> = {
  spiral: "round",
  cup: "pointed",
  spray: "teardrop",
  spike: "blade",
  spathe: "heart",
  fan: "blade",
};

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

function place(geo: THREE.BufferGeometry, position: THREE.Vector3, rotation: THREE.Euler, scale = 1) {
  tmpQuat.setFromEuler(rotation);
  tmpMatrix.compose(position, tmpQuat, new THREE.Vector3(scale, scale, scale));
  const out = geo.clone().applyMatrix4(tmpMatrix);
  geo.dispose();
  return out;
}

/** A ring (or several stacked rings) of petals. */
function petalRings(
  spec: Specimen,
  bloom: number,
  {
    shape = SHAPE_BY_FORM[spec.form],
    layerScale = 0.82,
    tilt = 0.5,
    jitter = 0.06,
  }: { shape?: "round" | "pointed" | "heart" | "blade" | "teardrop"; layerScale?: number; tilt?: number; jitter?: number } = {}
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const p = spec.petals;
  const layers = Math.max(1, p.layers);
  const perLayer = Math.max(1, Math.round(p.count / layers));
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let layer = 0; layer < layers; layer++) {
    const lt = layers === 1 ? 0 : layer / (layers - 1);
    const scale = 1 - lt * (1 - layerScale);
    for (let i = 0; i < perLayer; i++) {
      const angle = layer * (golden * 1.7) + (i / perLayer) * Math.PI * 2 + layer * jitter;
      const wobble = Math.sin(i * 12.9898 + layer * 78.233) * jitter;

      const geo = petalGeometry({
        length: p.length * scale * (0.94 + wobble),
        width: p.width * scale * (0.94 + wobble * 0.6),
        cup: p.cup,
        curl: p.curl,
        twist: p.twist * 0.55,
        shape,
        open: bloom,
        ruffle: spec.form === "spiral" ? 0.018 : 0.008,
        segmentsU: spec.form === "spathe" ? 26 : 16,
        segmentsV: spec.form === "spathe" ? 16 : 11,
      });

      const outward = tilt + lt * 0.42 + Math.abs(wobble) * 0.6;
      const rot = new THREE.Euler(-Math.PI / 2 + outward * 0.35, angle, 0, "YXZ");
      const pos = new THREE.Vector3(
        Math.cos(angle) * 0.02 * scale,
        p.rise * layer * scale + 0.015,
        Math.sin(angle) * 0.02 * scale
      );

      parts.push(place(geo, pos, rot, 1));
    }
  }

  return mergeAll(parts);
}

/** Dense stamens / spadix — thin spikes clustered at the centre. */
function stamenCluster(count: number, radius: number, height: number, bloom: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const n = Math.max(1, Math.round(count));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i * 0.7;
    const r = radius * (0.25 + 0.75 * ((i * 37) % 11) / 10);
    const h = height * (0.6 + (((i * 53) % 7) / 10) * 0.7) * (0.5 + bloom * 0.5);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(a) * r * 0.4, h * 0.5, Math.sin(a) * r * 0.4),
      new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r),
    ]);
    parts.push(taperedTube(curve, 0.012, { radial: 4, tubular: 6, taper: 0.7 }));
  }
  return mergeAll(parts);
}

/** The long central spike of an aroid (titan arum, anthurium). */
function spadix(height: number, radius: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.03, height * 0.45, 0.02),
    new THREE.Vector3(-0.02, height * 0.82, 0.03),
    new THREE.Vector3(0.01, height, 0),
  ]);
  return taperedTube(curve, radius, { radial: 10, tubular: 26, taper: 0.55 });
}

/** A straight display stem under a single flower head (used by the vitrine and the botany plate). */
export function buildDisplayStem(spec: Specimen, length = 2.6): THREE.BufferGeometry {
  const radius = spec.form === "spathe" ? 0.032 : 0.024;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -length, 0),
    new THREE.Vector3(0.02, -length * 0.55, 0.015),
    new THREE.Vector3(-0.01, -length * 0.2, 0.01),
    new THREE.Vector3(0, 0, 0),
  ]);
  return paintFlat(taperedTube(curve, radius, { radial: 7, tubular: 20, taper: 0.25 }), new THREE.Color(spec.colours.stem));
}

/** How open a given species should be at a global bloom value. */
export function speciesBloom(spec: Specimen, bloom: number): number {
  const lazy = spec.form === "spathe" ? 0.18 : spec.weight > 3 ? 0.1 : 0;
  return Math.min(1, Math.max(0.18, bloom * (1 - lazy) + lazy * bloom * bloom));
}

export type FlowerGeometry = {
  /** petals + bracts, vertex-coloured */
  head: THREE.BufferGeometry;
  /** core / stamen / spadix, vertex-coloured */
  core: THREE.BufferGeometry | null;
  /** the vertical stem this head sits on, in local space (0..headBase) */
  stem: THREE.BufferGeometry;
  /** height of the head above the stem origin */
  headHeight: number;
};

/** Build one flower head in local space. Deterministic — no randomness inside. */
export function buildFlower(spec: Specimen, bloom: number): FlowerGeometry {
  const petalFrom = new THREE.Color(spec.colours.petal[0]);
  const petalTo = new THREE.Color(spec.colours.petal[1]);
  const coreColour = new THREE.Color(spec.colours.core);
  const stemColour = new THREE.Color(spec.colours.stem);

  let headParts: THREE.BufferGeometry[] = [];
  let coreParts: THREE.BufferGeometry[] = [];
  let headHeight = 0;
  const stemRadius = spec.form === "spathe" ? 0.028 : 0.018;

  switch (spec.form) {
    case "spiral": {
      headParts = [petalRings(spec, bloom, { shape: "round", tilt: 0.35, layerScale: 0.86 })];
      coreParts = [petalGeometry({ length: 0.22, width: 0.22, cup: 0.9, curl: 0.4, twist: 0.2, shape: "round", open: bloom })];
      headHeight = 0;
      break;
    }
    case "cup": {
      headParts = [petalRings(spec, bloom, { shape: "pointed", tilt: 0.95, layerScale: 0.7 })];
      coreParts = [stamenCluster(22, 0.18, 0.26, bloom)];
      headHeight = 0;
      break;
    }
    case "spray": {
      // a small raceme: several heads stepping up a shared axis
      const branches = spec.spike?.count ?? 3;
      const total = spec.spike?.height ?? 1.2;
      for (let b = 0; b < branches; b++) {
        const t = branches === 1 ? 0 : b / (branches - 1);
        // heads fan out from a single point near the stem tip rather than climbing a
        // tall invisible rachis — closer to how an orchid spray actually reads
        const y = total * (0.18 + t * 0.28) * (0.55 + bloom * 0.45);
        const a = b * 2.1 + 0.6;
        const spread = 0.13 + t * 0.09;
        const offset = new THREE.Vector3(Math.cos(a) * spread, y, Math.sin(a) * spread);
        const small = 0.72 + t * 0.18;
        const ring = petalRings(spec, bloom, { shape: "pointed", tilt: 0.52, layerScale: 0.74 });
        const scaled = ring.clone().scale(small, small, small);
        ring.dispose();
        // tilt each head outward along its own branch
        headParts.push(place(scaled, offset, new THREE.Euler(0.5, a, 0.1)));
        coreParts.push(
          place(
            petalGeometry({ length: 0.09, width: 0.09, cup: 0.8, curl: 0.3, twist: 0, shape: "round" }),
            offset,
            new THREE.Euler(0.34, a, 0),
            small
          )
        );
        headHeight = Math.max(headHeight, y);
      }
      break;
    }
    case "spike": {
      const branches = spec.spike?.count ?? 3;
      const total = spec.spike?.height ?? 1.5;
      for (let b = 0; b < branches; b++) {
        const t = branches === 1 ? 0 : b / (branches - 1);
        const y = total * (0.4 + t * 0.6) * (0.6 + bloom * 0.4);
        const a = b * 2.1 + 0.4;
        const ring = petalRings(spec, bloom, { shape: "pointed", tilt: 1.05, layerScale: 0.85 });
        const s = 0.5 + t * 0.15;
        const scaled = ring.clone().scale(s, s, s);
        ring.dispose();
        headParts.push(place(scaled, new THREE.Vector3(Math.cos(a) * 0.06, y, Math.sin(a) * 0.06), new THREE.Euler(0.35, a, 0.2)));
        coreParts.push(place(stamenCluster(9, 0.07, 0.16, bloom), new THREE.Vector3(Math.cos(a) * 0.06, y, Math.sin(a) * 0.06), new THREE.Euler(0, a, 0)));
        headHeight = Math.max(headHeight, y);
      }
      break;
    }
    case "spathe": {
      // one heart-shaped leathery spathe, folded around a central spadix
      const spathe = petalGeometry({
        length: spec.petals.length * (0.6 + bloom * 0.4),
        width: spec.petals.width * (0.6 + bloom * 0.4),
        cup: spec.petals.cup,
        curl: spec.petals.curl,
        twist: 0.12,
        shape: "heart",
        segmentsU: 22,
        segmentsV: 16,
        open: bloom,
      });
      // stand the spathe up and fold it slightly around the spike
      headParts = [place(spathe, new THREE.Vector3(0, 0, 0), new THREE.Euler(-0.28, 0, 0))];
      const sp = spec.spike;
      if (sp) coreParts = [spadix(sp.height * (0.5 + bloom * 0.5), sp.radius)];
      break;
    }
    case "fan": {
      // bird of paradise: a horizontal fan of pointed bracts
      const p = spec.petals;
      for (let i = 0; i < p.count; i++) {
        const a = -p.spread / 2 + (i / Math.max(1, p.count - 1)) * p.spread;
        const geo = petalGeometry({
          length: p.length * (0.8 + (i / p.count) * 0.35),
          width: p.width,
          cup: 0.15,
          curl: 0.5,
          twist: 0.9,
          shape: "pointed",
          open: bloom,
          segmentsU: 12,
          segmentsV: 6,
        });
        headParts.push(place(geo, new THREE.Vector3(Math.sin(a) * 0.05, 0.04, 0), new THREE.Euler(-1.15 + Math.abs(a) * 0.2, a, a * 0.6)));
      }
      coreParts = [place(spadix(0.4, 0.05), new THREE.Vector3(0.02, 0.05, 0.05), new THREE.Euler(-0.5, 0, 0))];
      break;
    }
  }

  const head = paintGradient(mergeAll(headParts), petalFrom, petalTo);
  const core = coreParts.length ? paintFlat(mergeAll(coreParts), coreColour) : null;

  // A short collar hides the join between petal base and stem. It is built in the head's
  // local frame; the long stem itself is generated in bouquet space by buildStem().
  const collar = taperedTube(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.09, 0),
      new THREE.Vector3(0, -0.045, 0),
      new THREE.Vector3(0, 0.01, 0),
    ]),
    stemRadius * 1.15,
    { radial: 6, tubular: 4, taper: 0.1 }
  );
  const stem = paintFlat(collar, stemColour);

  return { head, core, stem, headHeight };
}

/**
 * A stem in bouquet space: a bowed curve from the vessel mouth to the head.
 * Returned separately so it can be merged with the head geometry for one draw call.
 */
export function buildStem(stem: Stem, spec: Specimen): { geometry: THREE.BufferGeometry; tip: THREE.Vector3; rotation: THREE.Euler } {
  const { origin, azimuth, lean, length, bow, roll } = stem;
  const radius = spec.form === "spathe" ? 0.03 : 0.022;

  const dir = new THREE.Vector3(Math.cos(azimuth) * Math.sin(lean), Math.cos(lean), Math.sin(azimuth) * Math.sin(lean));
  const tip = new THREE.Vector3(...origin).addScaledVector(dir, length);
  const mid = new THREE.Vector3(...origin)
    .addScaledVector(dir, length * 0.5)
    .add(new THREE.Vector3(Math.sin(azimuth + Math.PI / 2) * bow * 0.12, 0, Math.cos(azimuth + Math.PI / 2) * bow * 0.12));

  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...origin), mid, tip]);
  const geometry = paintFlat(taperedTube(curve, radius, { radial: 6, tubular: 18, taper: 0.55 }), new THREE.Color(spec.colours.stem));

  // the head points along the stem, tilted outward, then rolled for variety
  const rotation = new THREE.Euler(lean * 0.75, -(azimuth + Math.PI / 2) + roll, roll * 0.25, "YXZ");
  return { geometry, tip, rotation };
}
