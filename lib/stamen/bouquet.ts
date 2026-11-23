// A bouquet: flower heads laid on a dome the way a florist spirals a
// hand-tied bunch, their stems gathered at the vase's mouth, leaves on the
// stems, eucalyptus arching through, all standing in a stoneware vase. The
// stems bend on the GPU, so the heads can sway and lean toward the light the
// way they do in a time-lapse.

import * as THREE from "three";
import { FlowerSet, SPECIES, type FlowerSpec, type SpeciesId } from "./flora";
import { OUTLINES, petalGeometry, petalMaterial, petalDepthMaterial, petalMesh, type PetalLook } from "./petal";
import { clamp, lerp, rng, smooth } from "./util";

export interface Recipe {
  /** flowers by species, how many of each */
  stems: Partial<Record<SpeciesId, number>>;
  eucalyptus: number;
  /** 0 every flower in palette A, 1 all in palette B, between a mix */
  tone: number;
  /** the dome: how wide and how tall */
  radius: number;
  /** a hand-tied dome (the default), or single stems side by side (the library) */
  layout?: "dome" | "row";
}

export const LEAF_LOOK: PetalLook = {
  a: ["#16301a", "#2f5a2c", "#5b8a43"],
  b: ["#16301a", "#2f5a2c", "#5b8a43"],
  edge: "#7da65a",
  edgeAmt: 0.15,
  vein: 0.35,
  back: 0.4,
  roughness: 0.55,
  sheen: 0.1,
  relief: 0.007,
  under: 0.38,
};

export const EUCALYPTUS_LOOK: PetalLook = {
  a: ["#4f6b66", "#7e9c95", "#a7c2b8"],
  b: ["#4f6b66", "#7e9c95", "#a7c2b8"],
  edge: "#c5d8cf",
  edgeAmt: 0.25,
  vein: 0.05,
  back: 0.25,
  roughness: 0.7,
  sheen: 0.5,
  relief: 0.003,
  under: 0.2,
};

/*
 * The stem budget for the sway uniform. It is a hard limit: `uSway` is a fixed
 * array, and the render loop writes one entry per *planned* stem, so if a recipe
 * ever asked for more stems than this the loop would write past the array. It
 * used to be a flat 40, which fitted six species; deriving it from the species
 * table keeps that guarantee as the roster grows.
 */
const MAX_STEMS = Object.keys(SPECIES).length * 8;

const STEM_VERT = /* glsl */ `
attribute float aStem;
attribute float aT;
uniform vec3 uSway[${MAX_STEMS}];
`;

/** one stem's path, in the bouquet's frame (the vase mouth at the origin) */
interface StemPlan {
  curve: THREE.CatmullRomCurve3;
  /** index into the sway table */
  id: number;
  radius: number;
}

interface LeafPlan {
  stem: number;
  /** where on the stem (0 the vase, 1 the head) */
  t: number;
  phi: number;
  tilt: number;
  len: number;
  coin: boolean;
  seed: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

export class Bouquet {
  group = new THREE.Group();
  flowers: FlowerSet;
  stems: THREE.Mesh;
  stemMat: THREE.MeshStandardMaterial;
  leaves: ReturnType<typeof petalMesh>;
  coins: ReturnType<typeof petalMesh>;
  vase: THREE.Mesh;
  wrap: ReturnType<typeof makeWrap>;
  private sway = Array.from({ length: MAX_STEMS }, () => new THREE.Vector3());
  private specs: FlowerSpec[] = [];
  private rest: THREE.Matrix4[] = [];
  private plans: StemPlan[] = [];
  private leafPlans: LeafPlan[] = [];
  private headStem: number[] = [];
  private stemPhase: number[] = [];
  private detail: number;

  constructor(detail: number, capacityPerSpecies = 6) {
    this.detail = detail;
    this.flowers = new FlowerSet(detail, capacityPerSpecies);
    this.group.add(this.flowers.group);

    const swayU = { value: this.sway };
    this.stemMat = new THREE.MeshStandardMaterial({ color: "#3f6a2e", roughness: 0.55 });
    const bend = (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uSway = swayU;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${STEM_VERT}`)
        .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += uSway[int(aStem + 0.5)] * aT * aT;");
    };
    this.stemMat.onBeforeCompile = bend;
    this.stemMat.customProgramCacheKey = () => "stamen-stem";
    const stemDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    stemDepth.onBeforeCompile = bend;
    stemDepth.customProgramCacheKey = () => "stamen-stem-depth";
    this.stems = new THREE.Mesh(new THREE.BufferGeometry(), this.stemMat);
    this.stems.customDepthMaterial = stemDepth;
    this.stems.castShadow = true;
    this.stems.receiveShadow = true;
    this.stems.frustumCulled = false;
    this.group.add(this.stems);

    const depth = petalDepthMaterial();
    const segU = detail > 0.5 ? 12 : 6;
    const segV = detail > 0.5 ? 18 : 9;
    this.leaves = petalMesh(petalGeometry(OUTLINES.leaf, segU, segV), petalMaterial(LEAF_LOOK).material, depth, MAX_STEMS * 4);
    this.coins = petalMesh(petalGeometry(OUTLINES.coin, segU, segV), petalMaterial(EUCALYPTUS_LOOK).material, depth, 20 * 16);
    this.group.add(this.leaves.mesh, this.coins.mesh);

    this.vase = makeVase(detail);
    this.wrap = makeWrap(detail);
    this.wrap.group.visible = false;
    this.group.add(this.vase, this.wrap.group);
  }

  /** stand it in the vase, wrap it in paper, or neither */
  setVessel(kind: "vase" | "wrap" | "none") {
    this.vase.visible = kind === "vase";
    this.wrap.group.visible = kind === "wrap";
  }

  /** lay out a bouquet from a recipe */
  build(recipe: Recipe, seed: number) {
    const r = rng(seed);
    // the flowers, big ones spread through the dome rather than bunched
    const list: SpeciesId[] = [];
    /*
     * Round-robin through this order so no species bunches together in the dome.
     * The four exotic specimens sit at the end: the big architectural ones read
     * better as accents between the soft flowers than as a block of their own.
     */
    const order: SpeciesId[] = Object.keys(SPECIES) as SpeciesId[];
    let left = true;
    while (left) {
      left = false;
      for (const id of order) {
        const n = recipe.stems[id] || 0;
        const have = list.filter((x) => x === id).length;
        if (have < n) {
          list.push(id);
          left = true;
        }
      }
    }
    const N = list.length;
    const R = recipe.radius;
    const center = new THREE.Vector3(0, R * 0.62, 0);
    const cap = 1.15; // half-angle of the dome, radians
    this.specs = [];
    this.rest = [];
    this.plans = [];
    this.leafPlans = [];
    this.headStem = [];
    this.stemPhase = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const start = r() * Math.PI * 2;
    const row = recipe.layout === "row";
    list.forEach((id, i) => {
      if (row) {
        // the library: each stem standing on its own, a little apart
        const x = (i - (N - 1) / 2) * R;
        const pos = new THREE.Vector3(x, 0.32 + (i % 2) * 0.04, 0);
        const axis = new THREE.Vector3(0, 1, 0.55).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(Y, axis).multiply(new THREE.Quaternion().setFromAxisAngle(Y, r() * Math.PI * 2));
        const head = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
        this.rest.push(head.clone());
        this.specs.push({ species: id, head, size: 1.25, delay: 0, rate: 1, tone: recipe.tone >= 1 ? 1 : 0, seed: seed * 31 + i * 7 });
        const stemId = this.plans.length;
        const below = pos.clone().addScaledVector(axis, -0.08);
        this.plans.push({
          curve: new THREE.CatmullRomCurve3([pos.clone().addScaledVector(axis, -0.004), below, new THREE.Vector3(x, 0.05, 0.02), new THREE.Vector3(x, -0.25, 0), new THREE.Vector3(x, -0.6, 0)]),
          id: stemId,
          radius: 0.0065,
        });
        this.headStem.push(stemId);
        this.stemPhase.push(r() * Math.PI * 2);
        const s = SPECIES[id];
        for (let k = 0; k < Math.max(1, s.leaves); k++) this.leafPlans.push({ stem: stemId, t: 0.3 + k * 0.12, phi: k * 2.6 + r(), tilt: 0.8 + r() * 0.3, len: 0.12 + r() * 0.03, coin: false, seed: r() });
        return;
      }
      const z = 1 - ((i + 0.5) / N) * (1 - Math.cos(cap));
      const rr = Math.sqrt(Math.max(0, 1 - z * z));
      const th = start + i * golden;
      const dir = new THREE.Vector3(rr * Math.cos(th), z, rr * Math.sin(th));
      const pos = center.clone().addScaledVector(dir, R * (0.88 + r() * 0.22));
      // a little depth: some heads sit proud, some tucked in
      pos.addScaledVector(dir, (r() - 0.5) * R * 0.18);
      const axis = dir.clone().add(new THREE.Vector3(0, 0.55, 0)).normalize();
      axis.x += (r() - 0.5) * 0.25;
      axis.z += (r() - 0.5) * 0.25;
      axis.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(Y, axis);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(Y, r() * Math.PI * 2));
      const s = SPECIES[id];
      const head = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
      this.rest.push(head.clone());
      this.specs.push({
        species: id,
        head,
        size: 0.92 + r() * 0.16,
        delay: r() * 0.16 + (s.id === "tulip" ? 0.05 : 0) + (s.id === "peony" ? 0.08 : 0),
        rate: 1.25 + r() * 0.15,
        tone: recipe.tone >= 1 ? 1 : recipe.tone <= 0 ? 0 : r() < recipe.tone ? 1 : 0,
        seed: seed * 31 + i * 7,
      });
      // its stem: down from the head along its axis, through the binding, into the vase
      const stemId = this.plans.length;
      const bind = new THREE.Vector3((r() - 0.5) * 0.03, -0.02, (r() - 0.5) * 0.03);
      const foot = new THREE.Vector3(Math.cos(th) * 0.08, -0.5, Math.sin(th) * 0.08);
      const below = pos.clone().addScaledVector(axis, -0.06 * s.stem);
      const mid = below.clone().lerp(bind, 0.55).add(new THREE.Vector3(0, 0.03, 0));
      this.plans.push({ curve: new THREE.CatmullRomCurve3([pos.clone().addScaledVector(axis, -0.004), below, mid, bind, foot]), id: stemId, radius: 0.0055 });
      this.headStem.push(stemId);
      this.stemPhase.push(r() * Math.PI * 2);
      for (let k = 0; k < s.leaves; k++) {
        this.leafPlans.push({ stem: stemId, t: 0.32 + r() * 0.3, phi: r() * Math.PI * 2, tilt: 0.7 + r() * 0.5, len: 0.11 + r() * 0.05, coin: false, seed: r() });
      }
    });
    // eucalyptus: longer stems arching out between the flowers, coins all along
    for (let e = 0; e < recipe.eucalyptus; e++) {
      const th = start + (e / Math.max(1, recipe.eucalyptus)) * Math.PI * 2 + r() * 0.5;
      const reach = R * (1.25 + r() * 0.35);
      const tip = new THREE.Vector3(Math.cos(th) * reach, R * (0.25 + r() * 0.55), Math.sin(th) * reach);
      const bind = new THREE.Vector3(0, -0.02, 0);
      const foot = new THREE.Vector3(Math.cos(th) * 0.07, -0.5, Math.sin(th) * 0.07);
      const mid = tip.clone().multiplyScalar(0.45).add(new THREE.Vector3(0, R * 0.55, 0));
      const stemId = this.plans.length;
      this.plans.push({ curve: new THREE.CatmullRomCurve3([tip, mid, bind, foot]), id: stemId, radius: 0.0035 });
      this.stemPhase.push(r() * Math.PI * 2);
      const n = 9 + Math.floor(r() * 5);
      for (let k = 0; k < n; k++) {
        this.leafPlans.push({ stem: stemId, t: 0.5 + (k / n) * 0.48, phi: k * 2.4 + r(), tilt: 0.9 + r() * 0.5, len: 0.045 + r() * 0.03 * (1 - k / n), coin: true, seed: r() });
      }
    }
    this.flowers.place(this.specs);
    this.buildStems();
  }

  private buildStems() {
    const geos: THREE.BufferGeometry[] = [];
    const tubular = this.detail > 0.5 ? 44 : 18;
    const radial = this.detail > 0.5 ? 8 : 5;
    for (const p of this.plans) {
      const g = new THREE.TubeGeometry(p.curve, tubular, p.radius, radial, false);
      const n = g.attributes.position.count;
      // aT: 0 at the vase, 1 at the head (the tube runs from the head down)
      const t = new Float32Array(n);
      const id = new Float32Array(n).fill(p.id);
      for (let i = 0; i < n; i++) {
        const seg = Math.floor(i / (radial + 1));
        t[i] = clamp(1 - seg / tubular / 0.62);
      }
      g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
      g.setAttribute("aStem", new THREE.BufferAttribute(id, 1));
      geos.push(g);
    }
    this.stems.geometry.dispose();
    this.stems.geometry = mergeAll(geos);
  }

  /**
   * Open the flowers (bloom 0..1), scatter them (0..1), sway the stems, and
   * turn the heads toward `light` (a direction, in the bouquet's frame) by `lean`.
   */
  update(opts: { bloom: number; scatter: number; time: number; world: THREE.Matrix4; toward: THREE.Vector3; wind: THREE.Vector3; light: THREE.Vector3; lean: number; breeze: number }) {
    const { bloom, time, lean, breeze } = opts;
    // each stem's sway: a slow drift, the lean to the light, more as the head gets heavy
    for (let i = 0; i < this.plans.length; i++) {
      const ph = this.stemPhase[i];
      const heavy = 0.6 + 0.4 * smooth(bloom);
      this.sway[i].set(
        (Math.sin(time * 0.7 + ph) * 0.008 + Math.sin(time * 1.9 + ph * 2) * 0.003) * breeze * heavy + opts.light.x * lean * 0.05,
        -0.012 * smooth((bloom - 0.75) / 0.25) * (i % 3 === 0 ? 1.4 : 0.6),
        (Math.cos(time * 0.6 + ph) * 0.007) * breeze * heavy + opts.light.z * lean * 0.05,
      );
    }
    // move the heads with their stems
    for (let i = 0; i < this.specs.length; i++) {
      const sw = this.sway[this.headStem[i]];
      this.specs[i].head.copy(this.rest[i]);
      this.specs[i].head.elements[12] += sw.x;
      this.specs[i].head.elements[13] += sw.y;
      this.specs[i].head.elements[14] += sw.z;
    }
    this.flowers.pose(bloom, opts.scatter, opts.world, opts.toward, opts.wind);
    // leaves and eucalyptus coins ride their stems
    let li = 0;
    let ci = 0;
    for (const lp of this.leafPlans) {
      const plan = this.plans[lp.stem];
      // the tube's aT runs head (1) to vase (0) over the first 62% of the curve
      const u = clamp((1 - lp.t) * 0.62);
      plan.curve.getPointAt(u, tmpV);
      plan.curve.getTangentAt(u, tmpV2);
      const k = clamp(lp.t);
      tmpV.addScaledVector(this.sway[plan.id], k * k);
      // the leaf leaves the stem at an angle, round it by phi
      tmpQ.setFromUnitVectors(Y, tmpV2.negate());
      tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(Y, lp.phi));
      tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lp.tilt));
      const L = lp.len;
      const grow = lp.coin ? 1 : lerp(0.85, 1, smooth(bloom));
      tmpM.compose(tmpV, tmpQ, tmpS.set(L * (lp.coin ? 1 : 0.9), L * grow, L * (lp.coin ? 1 : 0.9)));
      tmpM.premultiply(opts.world);
      const target = lp.coin ? this.coins : this.leaves;
      const idx = lp.coin ? ci++ : li++;
      target.mesh.setMatrixAt(idx, tmpM);
      target.shape.setXYZW(idx, lp.coin ? 0.6 : 1.4, lp.coin ? 0.3 : 0.9, lp.coin ? 0 : 0.02, lp.seed);
      target.tone.setXYZW(idx, 0, 0.85 + lp.seed * 0.3, 0, 0.2);
    }
    this.leaves.mesh.count = li;
    this.coins.mesh.count = ci;
    for (const t of [this.leaves, this.coins]) {
      t.mesh.instanceMatrix.needsUpdate = true;
      t.shape.needsUpdate = true;
      t.tone.needsUpdate = true;
    }
    this.stems.matrixAutoUpdate = false;
    this.stems.matrix.copy(opts.world);
    this.stems.matrixWorldNeedsUpdate = true;
    this.vase.matrixAutoUpdate = false;
    this.vase.matrix.copy(opts.world);
    this.vase.matrixWorldNeedsUpdate = true;
    this.wrap.group.matrixAutoUpdate = false;
    this.wrap.group.matrix.copy(opts.world);
    this.wrap.group.matrixWorldNeedsUpdate = true;
  }
}

/** a stoneware vase: thrown on a wheel, speckled, mouth at y = 0 */
function makeVase(detail: number) {
  const pts: THREE.Vector2[] = [];
  const prof: [number, number][] = [
    [0, -0.56], [0.1, -0.56], [0.118, -0.552], [0.124, -0.53], [0.13, -0.45], [0.142, -0.33], [0.148, -0.22], [0.142, -0.12],
    [0.122, -0.05], [0.104, -0.012], [0.102, 0], [0.108, 0.006], [0.112, 0.004], [0.11, -0.004], [0.094, -0.012], [0.092, -0.1],
  ];
  const curve = new THREE.SplineCurve(prof.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const p of curve.getPoints(detail > 0.5 ? 60 : 30)) pts.push(p);
  const g = new THREE.LatheGeometry(pts, detail > 0.5 ? 72 : 40);
  const m = new THREE.MeshPhysicalMaterial({ color: "#ece3da", roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vVasePos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvVasePos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vVasePos;
float vh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  // iron speckle in the clay, and faint throwing rings
  float sp = vh(floor(vVasePos * 900.0));
  diffuseColor.rgb *= sp > 0.985 ? 0.45 : 1.0;
  diffuseColor.rgb *= 0.985 + 0.015 * sin(vVasePos.y * 260.0);
}`,
      );
  };
  m.customProgramCacheKey = () => "stamen-vase";
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Florist's paper: a pleated cone flaring up round the lower half of the
 * bouquet, gathered at the binding with a ribbon, and a narrow sleeve below
 * it round the stems.
 */
export function makeWrap(detail: number) {
  const seg = detail > 0.5 ? 120 : 64;
  const rows = detail > 0.5 ? 28 : 16;
  const sheet = (y0: number, y1: number, r0: number, r1: number, pleat: number, rimWave: number) => {
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        const a = u * Math.PI * 2;
        // pleats: a few big folds and many small ones, growing toward the open edge
        const fold = (Math.sin(a * 7 + 0.6) * 0.65 + Math.sin(a * 17 + 2.1) * 0.35) * pleat * v;
        const r = lerp(r0, r1, Math.pow(v, 0.85)) + fold;
        // the cut edge isn't level: two high corners, like a real sheet
        const y = lerp(y0, y1, v) + rimWave * Math.pow(v, 3) * (Math.sin(a + 0.4) * 0.6 + Math.sin(a * 2 + 1.3) * 0.4);
        pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
        uv.push(u, v);
      }
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i;
        const b = a + 1;
        const c = a + seg + 1;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    g.setIndex(idx);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };
  const paper = new THREE.MeshStandardMaterial({ color: "#c9a27c", roughness: 0.88, side: THREE.DoubleSide });
  paper.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vPaperUv;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPaperUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vPaperUv;
float ph(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
  // paper fibres, and the inside a shade darker
  diffuseColor.rgb *= 0.94 + 0.06 * ph(floor(vPaperUv * vec2(900.0, 260.0)));
  if (!gl_FrontFacing) diffuseColor.rgb *= 0.86;`,
      );
  };
  paper.customProgramCacheKey = () => "stamen-paper";
  const upper = new THREE.Mesh(sheet(-0.06, 0.3, 0.05, 0.4, 0.028, 0.06), paper);
  const lower = new THREE.Mesh(sheet(-0.05, -0.42, 0.055, 0.085, 0.008, 0), paper);
  const ribbonMat = new THREE.MeshStandardMaterial({ color: "#f4ead8", roughness: 0.35, metalness: 0.05 });
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 8, 48), ribbonMat);
  ribbon.rotation.x = Math.PI / 2;
  ribbon.position.y = -0.05;
  // a bow: two loops and two tails
  const loop = new THREE.TorusGeometry(0.03, 0.007, 8, 24);
  const bowL = new THREE.Mesh(loop, ribbonMat);
  bowL.position.set(-0.026, -0.045, 0.064);
  bowL.rotation.set(0.2, 0.5, 0.3);
  const bowR = new THREE.Mesh(loop, ribbonMat);
  bowR.position.set(0.026, -0.045, 0.064);
  bowR.rotation.set(0.2, -0.5, -0.3);
  const group = new THREE.Group();
  for (const m of [upper, lower, ribbon, bowL, bowR]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  return {
    group,
    setColors(paperHex: string, ribbonHex: string) {
      paper.color.set(paperHex);
      ribbonMat.color.set(ribbonHex);
    },
  };
}

function mergeAll(geos: THREE.BufferGeometry[]) {
  const names = ["position", "normal", "uv", "aT", "aStem"];
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  const idx: number[] = [];
  let off = 0;
  const bufs: Record<string, Float32Array> = {};
  for (const n of names) bufs[n] = new Float32Array(total * geos[0].attributes[n].itemSize);
  let vo = 0;
  for (const g of geos) {
    for (const n of names) {
      const a = g.attributes[n] as THREE.BufferAttribute;
      bufs[n].set(a.array as Float32Array, vo * a.itemSize);
    }
    const gi = g.index!;
    for (let i = 0; i < gi.count; i++) idx.push(gi.getX(i) + off);
    off += g.attributes.position.count;
    vo += g.attributes.position.count;
    g.dispose();
  }
  for (const n of names) out.setAttribute(n, new THREE.BufferAttribute(bufs[n], geos[0].attributes[n].itemSize));
  out.setIndex(idx);
  return out;
}
