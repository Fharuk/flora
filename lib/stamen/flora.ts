// The flowers. Each species is a recipe: how many petals, how they're laid
// round the head (a golden-angle spiral or even rings), their outline, size,
// how far each tips out when closed and when open, how cupped and curled, and
// when each one opens (outer petals first). A FlowerSet draws every flower of a
// bouquet with one instanced mesh per petal shape, and poses them all each
// frame from one number per flower: how far it has bloomed.

import * as THREE from "three";
import { OUTLINES, petalGeometry, petalMaterial, petalDepthMaterial, petalMesh, type OutlineId, type PetalLook } from "./petal";
import { clamp, lerp, rng, smooth } from "./util";

export type SpeciesId =
  | "peony"
  | "rose"
  | "ranunculus"
  | "tulip"
  | "anemone"
  | "cosmos"
  | "orchid"
  | "protea"
  | "dahlia"
  | "anthurium";

/** [outer, inner]: a value that runs from the outermost petal to the innermost */
type Span = [number, number];

export interface Species {
  id: SpeciesId;
  name: string;
  latin: string;
  outline: OutlineId;
  notch?: number;
  petals: number;
  /** spiral: golden angle; rings: even petals per ring, outer first */
  layout: "spiral" | "rings";
  rings?: number[];
  len: Span;
  /** width as a share of length */
  wid: Span;
  hingeR: Span;
  hingeY: Span;
  tiltClosed: Span;
  tiltOpen: Span;
  cupClosed: Span;
  cupOpen: Span;
  curlClosed: Span;
  curlOpen: Span;
  ruffle: number;
  /** how long the inner petals wait after the outer ones */
  lag: number;
  look: PetalLook;
  center: "none" | "boss" | "stamens" | "disc";
  sepals: number;
  /** stem length and leaf count, for the bouquet */
  stem: number;
  leaves: number;
}

export const SPECIES: Record<SpeciesId, Species> = {
  peony: {
    id: "peony",
    name: "Peony",
    latin: "Paeonia lactiflora",
    outline: "round",
    petals: 88,
    layout: "spiral",
    len: [0.15, 0.07],
    wid: [1.05, 0.9],
    hingeR: [0.014, 0.003],
    hingeY: [0, 0.022],
    tiltClosed: [0.1, 0.0],
    tiltOpen: [1.5, 0.42],
    cupClosed: [2.5, 2.9],
    cupOpen: [1.0, 2.2],
    curlClosed: [-1.45, -1.95],
    curlOpen: [0.6, -1.5],
    ruffle: 0.016,
    lag: 0.42,
    look: {
      a: ["#3a0f16", "#8e2537", "#c2606f"],
      b: ["#7a2c37", "#c9767f", "#f6e2d6"],
      edge: "#efcdc0",
      edgeAmt: 0.22,
      vein: 0.16,
      back: 0.55,
      roughness: 0.58,
      sheen: 0.7,
      relief: 0.005,
      under: 0.22,
    },
    center: "none",
    sepals: 5,
    stem: 1,
    leaves: 2,
  },
  rose: {
    id: "rose",
    name: "Garden rose",
    latin: "Rosa × hybrida",
    outline: "round",
    petals: 62,
    layout: "spiral",
    len: [0.11, 0.045],
    wid: [1.0, 0.85],
    hingeR: [0.011, 0.002],
    hingeY: [0, 0.016],
    tiltClosed: [0.08, -0.02],
    tiltOpen: [1.25, 0.32],
    cupClosed: [2.5, 2.9],
    cupOpen: [1.5, 2.6],
    curlClosed: [-1.3, -1.8],
    curlOpen: [1.0, -1.1],
    ruffle: 0.012,
    lag: 0.45,
    look: {
      a: ["#4a121b", "#9e2b3e", "#d4878b"],
      b: ["#8a3a44", "#d69aa0", "#fbf0e6"],
      edge: "#f6ded2",
      edgeAmt: 0.3,
      vein: 0.1,
      back: 0.5,
      roughness: 0.5,
      sheen: 0.55,
      relief: 0.004,
      under: 0.2,
    },
    center: "none",
    sepals: 5,
    stem: 1.05,
    leaves: 3,
  },
  ranunculus: {
    id: "ranunculus",
    name: "Ranunculus",
    latin: "Ranunculus asiaticus",
    outline: "oval",
    petals: 84,
    layout: "spiral",
    len: [0.085, 0.03],
    wid: [1.15, 1.0],
    hingeR: [0.01, 0.003],
    hingeY: [0, 0.014],
    tiltClosed: [0.1, 0.0],
    tiltOpen: [1.35, 0.22],
    cupClosed: [2.6, 3.0],
    cupOpen: [1.4, 2.8],
    curlClosed: [-1.4, -1.9],
    curlOpen: [0.4, -1.6],
    ruffle: 0.004,
    lag: 0.5,
    look: {
      a: ["#4a0f18", "#a23044", "#dd93a0"],
      b: ["#8a3a3c", "#dba08e", "#f7dbc8"],
      edge: "#f3d3c4",
      edgeAmt: 0.42,
      vein: 0.06,
      back: 0.45,
      roughness: 0.45,
      sheen: 0.45,
    },
    center: "boss",
    sepals: 5,
    stem: 0.95,
    leaves: 1,
  },
  tulip: {
    id: "tulip",
    name: "Tulip",
    latin: "Tulipa gesneriana",
    outline: "point",
    petals: 6,
    layout: "rings",
    rings: [3, 3],
    len: [0.13, 0.125],
    wid: [0.95, 0.95],
    hingeR: [0.012, 0.008],
    hingeY: [0, 0.004],
    tiltClosed: [0.1, 0.05],
    tiltOpen: [0.62, 0.42],
    cupClosed: [2.4, 2.6],
    cupOpen: [1.7, 1.9],
    curlClosed: [-0.9, -1.0],
    curlOpen: [0.28, 0.1],
    ruffle: 0.0,
    lag: 0.12,
    look: {
      a: ["#2a1215", "#5e2130", "#9e4a57"],
      b: ["#3a1a20", "#7d2b38", "#b8606a"],
      edge: "#d9a89c",
      edgeAmt: 0.18,
      vein: 0.08,
      back: 0.6,
      roughness: 0.38,
      sheen: 0.25,
      clearcoat: 0.35,
      relief: 0.003,
      under: 0.18,
    },
    center: "stamens",
    sepals: 0,
    stem: 1.15,
    leaves: 2,
  },
  anemone: {
    id: "anemone",
    name: "Anemone",
    latin: "Anemone coronaria",
    outline: "round",
    petals: 7,
    layout: "rings",
    rings: [4, 3],
    len: [0.1, 0.092],
    wid: [0.95, 0.9],
    hingeR: [0.016, 0.014],
    hingeY: [0, 0.003],
    tiltClosed: [0.12, 0.06],
    tiltOpen: [1.38, 1.22],
    cupClosed: [2.6, 2.8],
    cupOpen: [0.7, 0.9],
    curlClosed: [-1.65, -1.75],
    curlOpen: [0.18, 0.08],
    ruffle: 0.006,
    lag: 0.1,
    look: {
      a: ["#2a1215", "#8e2537", "#c2606f"],
      b: ["#2a1215", "#f0e4d8", "#ffffff"],
      edge: "#e8b0a4",
      edgeAmt: 0.08,
      vein: 0.12,
      back: 0.7,
      roughness: 0.5,
      sheen: 0.6,
      mark: "#f7e9f0",
      markAmt: 0.8,
      relief: 0.004,
      under: 0.2,
    },
    center: "stamens",
    sepals: 0,
    stem: 1.0,
    leaves: 1,
  },
  cosmos: {
    id: "cosmos",
    name: "Cosmos",
    latin: "Cosmos bipinnatus",
    outline: "oval",
    notch: 0.16,
    petals: 8,
    layout: "rings",
    rings: [8],
    len: [0.1, 0.1],
    wid: [0.85, 0.85],
    hingeR: [0.016, 0.016],
    hingeY: [0, 0],
    tiltClosed: [0.16, 0.16],
    tiltOpen: [1.5, 1.5],
    cupClosed: [2.4, 2.4],
    cupOpen: [0.35, 0.35],
    curlClosed: [-1.7, -1.7],
    curlOpen: [0.1, 0.1],
    ruffle: 0.003,
    lag: 0.06,
    look: {
      a: ["#4a1420", "#a2404f", "#d9929b"],
      b: ["#a86a6a", "#e8c2b4", "#fdf4ec"],
      edge: "#ffffff",
      edgeAmt: 0.08,
      vein: 0.28,
      back: 0.75,
      roughness: 0.55,
      sheen: 0.4,
    },
    center: "disc",
    sepals: 0,
    stem: 1.1,
    leaves: 1,
  },
  /*
   * The four exotic specimens. These are not florist-shop flowers, so they are
   * built against the shape each one is actually known for: a spray of narrow
   * floating petals (ghost orchid), a stiff collar around a furred heart (king
   * protea), a tight geometric ball of quilled petals (café au lait dahlia), and
   * one waxy leaf pretending to be a petal (velvet anthurium). Colours come from
   * the existing Flora-Synth specimen data so the two halves of the product
   * agree about what these flowers look like.
   */
  orchid: {
    id: "orchid",
    name: "Ghost orchid",
    latin: "Dendrophylax lindenii",
    outline: "oval",
    petals: 9,
    layout: "rings",
    rings: [5, 4],
    len: [0.085, 0.055],
    wid: [0.62, 0.5],
    hingeR: [0.018, 0.01],
    hingeY: [0, 0.008],
    tiltClosed: [0.5, 0.3],
    tiltOpen: [1.42, 1.2],
    cupClosed: [2.2, 2.5],
    cupOpen: [0.5, 0.85],
    curlClosed: [-1.2, -1.5],
    curlOpen: [0.35, 0.1],
    ruffle: 0.01,
    lag: 0.14,
    look: {
      a: ["#eef7ef", "#cfe8dc", "#a8cfc4"],
      b: ["#f8fffb", "#dcf2e8", "#bcdfd2"],
      edge: "#ffffff",
      edgeAmt: 0.5,
      vein: 0.1,
      // the whole point of this species: it reads as light let through the petal
      back: 0.92,
      roughness: 0.3,
      sheen: 0.8,
      clearcoat: 0.25,
      relief: 0.002,
      under: 0.35,
    },
    center: "stamens",
    sepals: 0,
    stem: 1.05,
    leaves: 0,
  },
  protea: {
    id: "protea",
    name: "King protea",
    latin: "Protea cynaroides",
    outline: "point",
    petals: 26,
    layout: "rings",
    rings: [14, 12],
    len: [0.16, 0.115],
    wid: [0.72, 0.62],
    hingeR: [0.03, 0.016],
    hingeY: [0, 0.012],
    tiltClosed: [0.42, 0.16],
    tiltOpen: [1.0, 0.55],
    cupClosed: [1.7, 2.2],
    cupOpen: [0.55, 1.15],
    curlClosed: [-0.85, -1.15],
    curlOpen: [0.22, 0.0],
    // stiff and bract-like: almost no crinkle, and it barely moves when it opens
    ruffle: 0.002,
    lag: 0.26,
    look: {
      a: ["#f2b9bf", "#e88b9c", "#cf5f77"],
      b: ["#f7d8d2", "#eeb0aa", "#d98a86"],
      edge: "#f7d2d6",
      edgeAmt: 0.34,
      vein: 0.2,
      back: 0.28,
      roughness: 0.72,
      sheen: 0.25,
      relief: 0.005,
      under: 0.3,
    },
    center: "boss",
    sepals: 0,
    stem: 1.2,
    leaves: 3,
  },
  dahlia: {
    id: "dahlia",
    name: "Café au Lait dahlia",
    latin: "Dahlia 'Café au Lait'",
    outline: "point",
    petals: 72,
    layout: "spiral",
    len: [0.115, 0.05],
    wid: [0.55, 0.62],
    hingeR: [0.012, 0.003],
    hingeY: [0, 0.018],
    tiltClosed: [0.06, 0.0],
    tiltOpen: [1.1, 0.28],
    cupClosed: [2.7, 3.0],
    cupOpen: [1.7, 2.7],
    curlClosed: [-1.5, -2.0],
    curlOpen: [0.85, -1.2],
    ruffle: 0.006,
    lag: 0.52,
    look: {
      a: ["#e8cbb6", "#f6e2cd", "#fbf1e4"],
      b: ["#d9a488", "#eec4ab", "#f9e6d6"],
      edge: "#fdf3e6",
      edgeAmt: 0.38,
      vein: 0.09,
      back: 0.62,
      roughness: 0.5,
      sheen: 0.5,
      relief: 0.004,
      under: 0.24,
    },
    center: "none",
    sepals: 5,
    stem: 1.05,
    leaves: 2,
  },
  anthurium: {
    id: "anthurium",
    name: "Velvet anthurium",
    latin: "Anthurium crystallinum",
    outline: "round",
    petals: 5,
    layout: "rings",
    rings: [5],
    len: [0.135, 0.135],
    wid: [0.8, 0.8],
    hingeR: [0.02, 0.02],
    hingeY: [0, 0],
    tiltClosed: [0.3, 0.3],
    tiltOpen: [0.95, 0.95],
    cupClosed: [2.0, 2.0],
    cupOpen: [0.75, 0.75],
    curlClosed: [-0.7, -0.7],
    curlOpen: [-0.25, -0.25],
    ruffle: 0.001,
    lag: 0.08,
    look: {
      a: ["#4a0a16", "#8e1224", "#a81c2c"],
      b: ["#5c0d1a", "#a01a2b", "#c22a38"],
      edge: "#c9556a",
      edgeAmt: 0.16,
      vein: 0.24,
      back: 0.3,
      roughness: 0.34,
      sheen: 0.9,
      clearcoat: 0.45,
      relief: 0.003,
      under: 0.14,
    },
    center: "boss",
    sepals: 0,
    stem: 1.1,
    leaves: 2,
  },
};

export const SEPAL_LOOK: PetalLook = {
  a: ["#1b3318", "#35602a", "#6b9845"],
  b: ["#1b3318", "#35602a", "#6b9845"],
  edge: "#8fb35a",
  edgeAmt: 0.2,
  vein: 0.15,
  back: 0.35,
  roughness: 0.6,
  sheen: 0.15,
};

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** one petal's fixed part: where it sits on the head and how it moves */
interface PetalPlan {
  phi: number;
  /** 0 outermost, 1 innermost */
  depth: number;
  len: number;
  wid: number;
  hingeR: number;
  hingeY: number;
  /** its bloom window */
  open0: number;
  open1: number;
  seed: number;
  /** a little character of its own */
  tiltJit: number;
  curlJit: number;
}

function planPetals(s: Species, seed: number): PetalPlan[] {
  const r = rng(seed);
  const out: PetalPlan[] = [];
  const at = (span: Span, d: number) => lerp(span[0], span[1], d);
  const push = (phi: number, depth: number) => {
    const len = at(s.len, depth) * (0.92 + r() * 0.16);
    out.push({
      phi,
      depth,
      len,
      wid: len * at(s.wid, depth) * (0.9 + r() * 0.2),
      hingeR: at(s.hingeR, depth),
      hingeY: at(s.hingeY, depth),
      open0: 0.16 + depth * s.lag + r() * 0.04,
      open1: 0.16 + depth * s.lag + 0.42 + r() * 0.06,
      seed: r(),
      tiltJit: (r() - 0.5) * 0.14,
      curlJit: (r() - 0.5) * 0.3,
    });
  };
  if (s.layout === "spiral") {
    const start = r() * Math.PI * 2;
    for (let i = 0; i < s.petals; i++) push(start + i * GOLDEN, s.petals > 1 ? Math.pow(i / (s.petals - 1), 0.9) : 0);
  } else {
    const rings = s.rings || [s.petals];
    const start = r() * Math.PI * 2;
    rings.forEach((n, k) => {
      for (let i = 0; i < n; i++) push(start + (i / n) * Math.PI * 2 + (k % 2 ? Math.PI / n : 0), rings.length > 1 ? k / (rings.length - 1) : 0);
    });
  }
  return out;
}

/** a flower in a bouquet: its head frame (origin at the top of the stem, +y its axis) and its timing */
export interface FlowerSpec {
  species: SpeciesId;
  head: THREE.Matrix4;
  size: number;
  /** when it starts and how fast it opens, against the bouquet's bloom */
  delay: number;
  rate: number;
  /** 0 palette A, 1 palette B */
  tone: number;
  seed: number;
}

interface Placed {
  spec: FlowerSpec;
  petals: PetalPlan[];
  sepals: PetalPlan[];
  /** first index in its species' mesh, and in the sepal mesh */
  base: number;
  sepalBase: number;
  /** first stamen, for flowers with an open center */
  stamenBase: number;
  stamens: number;
  centerIndex: number;
  /** each petal's flight, when the petals scatter */
  flight: Flight[];
}

interface Flight {
  at: number;
  dir: THREE.Vector3;
  spin: THREE.Vector3;
  swirl: number;
  phase: number;
}

const tmpM = new THREE.Matrix4();
const tmpM2 = new THREE.Matrix4();
const headM = new THREE.Matrix4();
const tmpQ2 = new THREE.Quaternion();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

/**
 * Every flower of a bouquet, drawn with one instanced mesh per species, one
 * for sepals, and a few for the centers. place() lays a bouquet out; pose()
 * opens it (bloom 0 to 1, per flower with its own delay) and scatters it.
 */
export class FlowerSet {
  group = new THREE.Group();
  meshes = {} as Record<SpeciesId, ReturnType<typeof petalMesh>>;
  materials = {} as Record<SpeciesId, ReturnType<typeof petalMaterial>>;
  sepal: ReturnType<typeof petalMesh>;
  boss: THREE.InstancedMesh;
  filament: THREE.InstancedMesh;
  anther: THREE.InstancedMesh;
  disc: THREE.InstancedMesh;
  private placed: Placed[] = [];

  constructor(detail: number, capacityPerSpecies = 6) {
    // detail 0 a phone, 1 a laptop, 2 the close-up
    const segU = detail > 1.5 ? 24 : detail > 0.5 ? 16 : 8;
    const segV = detail > 1.5 ? 36 : detail > 0.5 ? 24 : 12;
    const depth = petalDepthMaterial();
    for (const s of Object.values(SPECIES)) {
      const geo = petalGeometry(OUTLINES[s.outline], segU, segV, s.notch || 0);
      const mat = petalMaterial(s.look);
      this.materials[s.id] = mat;
      this.meshes[s.id] = petalMesh(geo, mat.material, depth, s.petals * capacityPerSpecies);
      this.group.add(this.meshes[s.id].mesh);
    }
    const sepalMat = petalMaterial(SEPAL_LOOK);
    this.sepal = petalMesh(petalGeometry(OUTLINES.sepal, 4, 8), sepalMat.material, depth, 6 * capacityPerSpecies * 6);
    this.group.add(this.sepal.mesh);

    const n = capacityPerSpecies * 6;
    const mk = (g: THREE.BufferGeometry, m: THREE.Material, count: number) => {
      const im = new THREE.InstancedMesh(g, m, count);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      im.count = 0;
      this.group.add(im);
      return im;
    };
    // the boss: a ranunculus' green eye, an anemone's dark knob
    const bossMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7 });
    bossMat.onBeforeCompile = (shader) => {
      // knobbly: the seed head's bumps, in the color and the shape
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBossN;").replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vBossN = normal;
float bump = sin(normal.x * 31.0) * sin(normal.y * 29.0) * sin(normal.z * 33.0);
transformed += normal * bump * 0.07;`,
      );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBossN;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
diffuseColor.rgb *= 0.75 + 0.25 * smoothstep(-0.3, 0.9, sin(vBossN.x * 31.0) * sin(vBossN.y * 29.0) * sin(vBossN.z * 33.0));`,
        );
    };
    bossMat.customProgramCacheKey = () => "stamen-boss";
    this.boss = mk(new THREE.IcosahedronGeometry(1, detail > 0.5 ? 4 : 2), bossMat, n);
    // stamens: a filament and its anther
    const fil = new THREE.CylinderGeometry(0.3, 0.55, 1, detail > 0.5 ? 7 : 4, 3, true);
    fil.translate(0, 0.5, 0);
    this.filament = mk(fil, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 }), n * 150);
    this.anther = mk(new THREE.IcosahedronGeometry(1, detail > 0.5 ? 2 : 1), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55, metalness: 0.1 }), n * 150);
    // a cosmos' disc of tiny florets
    const floret = new THREE.ConeGeometry(1, 1.8, 5, 1);
    floret.translate(0, 0.8, 0);
    this.disc = mk(floret, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5 }), n * 160);
  }

  /** lay out a bouquet */
  place(specs: FlowerSpec[]) {
    const used = {} as Record<SpeciesId, number>;
    let sepalUsed = 0;
    let stamenUsed = 0;
    let centers = 0;
    this.placed = specs.map((spec) => {
      const s = SPECIES[spec.species];
      const petals = planPetals(s, spec.seed);
      const sepals: PetalPlan[] = [];
      const r = rng(spec.seed + 99);
      for (let i = 0; i < s.sepals; i++) {
        sepals.push({
          phi: (i / s.sepals) * Math.PI * 2 + r() * 0.3,
          depth: 0,
          len: s.len[0] * 0.55,
          wid: s.len[0] * 0.55 * 0.9,
          hingeR: s.hingeR[0] * 0.9,
          hingeY: -0.004,
          open0: 0.04,
          open1: 0.3,
          seed: r(),
          tiltJit: (r() - 0.5) * 0.2,
          curlJit: (r() - 0.5) * 0.3,
        });
      }
      const base = used[spec.species] || 0;
      used[spec.species] = base + petals.length;
      const p: Placed = {
        spec,
        petals,
        sepals,
        base,
        sepalBase: sepalUsed,
        stamenBase: stamenUsed,
        stamens: s.center === "stamens" ? (spec.species === "anemone" ? 150 : 6) : s.center === "disc" ? 150 : 0,
        centerIndex: centers,
        flight: [],
      };
      sepalUsed += sepals.length;
      if (s.center === "stamens") stamenUsed += p.stamens;
      if (s.center !== "none") centers++;
      // scatter: the outermost go first, flung out and up, then the wind takes them
      const fr = rng(spec.seed + 7);
      p.flight = petals.map((pp) => ({
        at: (1 - pp.depth) * 0.08 + pp.depth * 0.42 + fr() * 0.28,
        dir: new THREE.Vector3(fr() - 0.5, fr() * 0.9 - 0.45, fr() - 0.5),
        spin: new THREE.Vector3((fr() - 0.5) * 9, (fr() - 0.5) * 7, (fr() - 0.5) * 9),
        swirl: 0.3 + fr() * 0.9,
        phase: fr() * Math.PI * 2,
      }));
      return p;
    });
    for (const s of Object.values(SPECIES)) this.meshes[s.id].mesh.count = used[s.id] || 0;
    this.sepal.mesh.count = sepalUsed;
    this.boss.count = centers;
    this.filament.count = stamenUsed;
    this.anther.count = stamenUsed;
    this.disc.count = this.placed.filter((p) => SPECIES[p.spec.species].center === "disc").reduce((n, p) => n + p.stamens, 0);
    this.colorCenters();
  }

  private colorCenters() {
    const c = new THREE.Color();
    let ci = 0;
    let di = 0;
    let si = 0;
    for (const p of this.placed) {
      const s = SPECIES[p.spec.species];
      if (s.center === "none") continue;
      if (s.center === "boss") this.boss.setColorAt(ci, c.set("#4f7a2a"));
      if (s.center === "stamens") this.boss.setColorAt(ci, c.set(p.spec.species === "anemone" ? "#1a1420" : "#7a8a3a"));
      if (s.center === "disc") this.boss.setColorAt(ci, c.set("#c88a12"));
      ci++;
      if (s.center === "stamens") {
        for (let k = 0; k < p.stamens; k++) {
          const dark = p.spec.species === "anemone";
          this.filament.setColorAt(si, c.set(dark ? "#3a1640" : "#3a2a30"));
          this.anther.setColorAt(si, c.set(dark ? (k % 5 === 0 ? "#5a4a7a" : "#1c1430") : "#2d2220"));
          si++;
        }
      }
      if (s.center === "disc") {
        for (let k = 0; k < p.stamens; k++) this.disc.setColorAt(di++, c.set(k % 7 === 0 ? "#f7d14a" : "#e2a51a"));
      }
    }
    for (const m of [this.boss, this.filament, this.anther, this.disc]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  /** set a palette for every flower of a species (the builder's color stories) */
  setLook(id: SpeciesId, a: [string, string, string], b: [string, string, string]) {
    const u = this.materials[id].uniforms;
    u.uA0.value.set(a[0]);
    u.uA1.value.set(a[1]);
    u.uA2.value.set(a[2]);
    u.uB0.value.set(b[0]);
    u.uB1.value.set(b[1]);
    u.uB2.value.set(b[2]);
  }

  /** how far one flower has bloomed, from the bouquet's bloom */
  bloomOf(i: number, bloom: number) {
    const p = this.placed[i];
    return clamp((bloom - p.spec.delay) * p.spec.rate);
  }

  /**
   * Open (bloom 0..1) and scatter (0..1) the bouquet. `world` places the head
   * frames; `toward` is where the petals fly (the camera), `wind` the gust.
   */
  pose(bloom: number, scatter: number, world: THREE.Matrix4, toward: THREE.Vector3, wind: THREE.Vector3) {
    let sep = 0;
    let si = 0;
    let di = 0;
    let ci = 0;
    for (const p of this.placed) {
      const s = SPECIES[p.spec.species];
      const b = clamp((bloom - p.spec.delay) * p.spec.rate);
      const head = headM.multiplyMatrices(world, p.spec.head);
      const mesh = this.meshes[s.id];
      const sz = p.spec.size;
      // the bud swells before it opens
      const swell = lerp(0.76, 1, smooth(b / 0.45));
      const blown = smooth((b - 0.9) / 0.1);
      const green = 1 - smooth((b - 0.04) / 0.3);
      for (let k = 0; k < p.petals.length; k++) {
        const pp = p.petals[k];
        const t = smooth((b - pp.open0) / (pp.open1 - pp.open0));
        const d = pp.depth;
        const at = (span: Span) => lerp(span[0], span[1], d);
        const tilt = lerp(at(s.tiltClosed), at(s.tiltOpen), t) + pp.tiltJit * t + blown * 0.25 * (1 - d);
        const cup = lerp(at(s.cupClosed), at(s.cupOpen), t);
        const curl = lerp(at(s.curlClosed), at(s.curlOpen), t) + pp.curlJit * t + blown * 0.4 * (1 - d);
        // place: round the head by phi, out to the hinge, tipped out by tilt
        tmpE.set(0, pp.phi, 0);
        tmpQ.setFromEuler(tmpE);
        tmpM.makeRotationFromQuaternion(tmpQ);
        tmpM.multiply(tmpM2.identity().makeTranslation(0, pp.hingeY * sz, pp.hingeR * sz));
        tmpM.multiply(tmpM2.identity().makeRotationX(tilt));
        const L = pp.len * sz * swell;
        const wrap = lerp(0.74, 1, t);
        tmpM.multiply(tmpM2.identity().makeScale(pp.wid * sz * swell * wrap, L, pp.wid * sz * swell * wrap));
        tmpM.premultiply(head);
        // scatter: from where it sits, out toward the lens and down the wind
        const f = p.flight[k];
        const ft = clamp((scatter - f.at) / 0.55);
        if (ft > 0) {
          tmpM.decompose(tmpP, tmpQ, tmpS);
          const e = ft * ft;
          tmpV.copy(toward).sub(tmpP).normalize();
          tmpP.addScaledVector(tmpV, e * 2.6 * f.swirl);
          tmpP.addScaledVector(wind, e * 1.5);
          tmpP.x += f.dir.x * e * 2.8 + Math.sin(f.phase + ft * 6) * 0.14 * ft;
          tmpP.y += f.dir.y * e * 2.4 + Math.cos(f.phase + ft * 5) * 0.12 * ft;
          tmpP.z += f.dir.z * e * 1.4;
          tmpE.set(f.spin.x * ft, f.spin.y * ft, f.spin.z * ft);
          tmpQ.multiply(tmpQ2.setFromEuler(tmpE));
          tmpM.compose(tmpP, tmpQ, tmpS);
        }
        const idx = p.base + k;
        mesh.mesh.setMatrixAt(idx, tmpM);
        // a petal in the air flattens out a little
        const flat = smooth(ft * 2);
        mesh.shape.setXYZW(idx, lerp(cup, cup * 0.4, flat), lerp(curl, 0.3, flat), s.ruffle / Math.max(0.02, pp.len) * 0.6 * (0.4 + 0.6 * t), pp.seed);
        mesh.tone.setXYZW(idx, p.spec.tone, 0.92 + pp.seed * 0.16, green * (1 - d * 0.6), d * (0.35 + 0.65 * t));
      }
      // sepals: they clasp the bud, then fold back
      for (let k = 0; k < p.sepals.length; k++) {
        const sp = p.sepals[k];
        const t = smooth((b - sp.open0) / (sp.open1 - sp.open0));
        tmpQ.setFromAxisAngle(Y, sp.phi);
        tmpM.makeRotationFromQuaternion(tmpQ);
        tmpM.multiply(tmpM2.identity().makeTranslation(0, sp.hingeY * sz, sp.hingeR * sz));
        tmpM.multiply(tmpM2.identity().makeRotationX(lerp(0.32, 2.15, t) + sp.tiltJit));
        tmpM.multiply(tmpM2.identity().makeScale(sp.wid * sz, sp.len * sz * lerp(0.75, 1, t), sp.wid * sz));
        tmpM.premultiply(head);
        this.sepal.mesh.setMatrixAt(sep, tmpM);
        this.sepal.shape.setXYZW(sep, lerp(2.4, 0.8, t), lerp(-0.6, 0.9, t), 0, sp.seed);
        this.sepal.tone.setXYZW(sep, 0, 0.9 + sp.seed * 0.2, 0, 0);
        sep++;
      }
      // the center: it shows as the flower opens, and is gone with the petals
      if (s.center !== "none") {
        const show = smooth((b - 0.45) / 0.35) * (1 - smooth((scatter - 0.5) / 0.3));
        const r = s.center === "boss" ? 0.012 : s.center === "disc" ? 0.02 : p.spec.species === "anemone" ? 0.016 : 0.008;
        const tall = s.center === "disc" ? 0.45 : p.spec.species === "tulip" ? 2.6 : 0.85;
        tmpM.compose(tmpP.set(0, (s.center === "disc" ? 0.002 : 0.006 * tall) * sz, 0), tmpQ.identity(), tmpS.set(r * sz, r * sz * tall, r * sz).multiplyScalar(Math.max(0.0001, 0.35 + 0.65 * show)));
        tmpM.premultiply(head);
        this.boss.setMatrixAt(ci++, tmpM);
        if (s.center === "stamens") {
          const many = p.stamens;
          for (let k = 0; k < many; k++) {
            const a = k * GOLDEN;
            const ring = p.spec.species === "anemone" ? 0.72 + 0.5 * (((k * 37) % many) / many) : 0.5;
            const lean = lerp(0.15, p.spec.species === "anemone" ? 0.75 + ring * 0.35 : 0.3, show);
            const flen = (p.spec.species === "anemone" ? 0.024 : 0.045) * sz * (0.7 + 0.6 * (((k * 13) % 11) / 11)) * Math.max(0.0001, show);
            tmpQ.setFromAxisAngle(Y, a);
            tmpM.makeRotationFromQuaternion(tmpQ);
            tmpM.multiply(tmpM2.identity().makeTranslation(0, 0.004 * sz, r * sz * ring));
            tmpM.multiply(tmpM2.identity().makeRotationX(lean));
            const fw = (p.spec.species === "anemone" ? 0.0006 : 0.0012) * sz;
            tmpM.multiply(tmpM2.identity().makeScale(fw, flen, fw));
            tmpM.premultiply(head);
            this.filament.setMatrixAt(si, tmpM);
            // the anther at the filament's tip
            tmpV.set(0, 1, 0).applyMatrix4(tmpM);
            const ar = (p.spec.species === "anemone" ? 0.0019 : 0.007) * sz * Math.max(0.0001, show);
            tmpM.compose(tmpV, tmpQ.setFromRotationMatrix(head), tmpS.set(ar, ar * 1.7, ar));
            this.anther.setMatrixAt(si, tmpM);
            si++;
          }
        }
        if (s.center === "disc") {
          for (let k = 0; k < p.stamens; k++) {
            // a sunflower spiral of tiny florets on a low dome
            const rr = Math.sqrt((k + 0.5) / p.stamens) * 0.019 * sz;
            const a = k * GOLDEN;
            const h = (0.006 - (rr / sz) * 0.2) * sz;
            const fs = 0.00105 * sz * Math.max(0.0001, show) * (1.15 - (rr / (0.019 * sz)) * 0.35);
            tmpQ.setFromAxisAngle(Y, a);
            tmpM.compose(tmpP.set(Math.cos(a) * rr, h, Math.sin(a) * rr), tmpQ, tmpS.set(fs, fs, fs));
            tmpM.premultiply(head);
            this.disc.setMatrixAt(di++, tmpM);
          }
        }
      }
    }
    for (const s of Object.values(SPECIES)) {
      const m = this.meshes[s.id];
      m.mesh.instanceMatrix.needsUpdate = true;
      m.shape.needsUpdate = true;
      m.tone.needsUpdate = true;
    }
    this.sepal.mesh.instanceMatrix.needsUpdate = true;
    this.sepal.shape.needsUpdate = true;
    this.sepal.tone.needsUpdate = true;
    this.boss.instanceMatrix.needsUpdate = true;
    this.filament.instanceMatrix.needsUpdate = true;
    this.anther.instanceMatrix.needsUpdate = true;
    this.disc.instanceMatrix.needsUpdate = true;
  }
}
