// Petals: one flat strip per outline, bent live on the GPU. Each instance
// carries its own shape (how cupped across, how curled along its length, how
// ruffled at the edge) and tone, so a whole bouquet of petals opens from a few
// numbers per petal per frame. The same bend runs in the shadow pass, so the
// shadows on the wall are the real, opening shapes.

import * as THREE from "three";

/** half-width of a petal along its length: v 0 at the hinge (the claw), 1 at the tip */
export type Outline = (v: number) => number;

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** a spoon: a narrow claw widening to a round tip */
function spoon(claw: number, widest: number, at: number): Outline {
  return (v) => {
    if (v <= at) return lerp(claw, widest, sm(0, 1, v / at));
    const k = (v - at) / (1 - at);
    return widest * Math.sqrt(Math.max(0, 1 - k * k));
  };
}

export const OUTLINES = {
  /** broad and round: peony, anemone, garden rose */
  round: spoon(0.09, 0.5, 0.58),
  /** a little narrower: ranunculus, the inner petals of a rose */
  oval: spoon(0.07, 0.4, 0.55),
  /** a tulip: wide in the middle, drawing to a soft point */
  point: (v: number) => (v <= 0.48 ? lerp(0.11, 0.42, sm(0, 1, v / 0.48)) : 0.42 * Math.pow(Math.max(0, 1 - (v - 0.48) / 0.52), 0.9) * (1 - 0.15 * sm(0.48, 1, v))),
  /** a sepal: narrow and pointed */
  sepal: (v: number) => 0.2 * Math.sin(Math.PI * Math.min(1, Math.pow(v, 0.6))) * (1 - 0.6 * v),
  /** a leaf: lanceolate */
  leaf: (v: number) => 0.32 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.8)), 0.85) * (1 - 0.09 * ((v * 17) % 1) * Math.sin(Math.PI * v)),
  /** a eucalyptus coin: nearly a disc, on a short stalk */
  coin: (v: number) => (v < 0.06 ? 0.03 : 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.53) / 0.47, 2)))),
} satisfies Record<string, Outline>;
export type OutlineId = keyof typeof OUTLINES;

/**
 * The strip: x across (scaled to the outline), y along (0 to 1), z flat. A
 * notched tip (cosmos) shortens the middle of the tip edge.
 */
export function petalGeometry(outline: Outline, segU: number, segV: number, notch = 0) {
  const g = new THREE.BufferGeometry();
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= segV; j++) {
    const v = j / segV;
    // more rows near the tip, where the outline turns
    const vv = 1 - Math.pow(1 - v, 1.35);
    const hw = Math.max(0.004, outline(vv));
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const s = u * 2 - 1;
      // three teeth at the tip, the middle one shortest
      const tip = notch > 0 ? 1 - notch * (0.55 + 0.45 * Math.cos(s * Math.PI * 3)) * 0.5 * Math.pow(vv, 6) : 1;
      pos.push(s * hw, vv * tip, 0);
      uv.push(u, vv);
    }
  }
  const row = segU + 1;
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }
  g.setIndex(idx);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, k) => (k % 3 === 2 ? 1 : 0)), 3));
  return g;
}

/** the bend, shared by the color and the shadow passes */
const DEFORM = /* glsl */ `
attribute vec4 aShape; // cup, curl, ruffle, seed
attribute vec4 aTone;  // palette mix, value, bud green, unused
vec3 petalDeform(vec3 p) {
  float cup = aShape.x;
  float k = aShape.y;
  float ruf = aShape.z;
  float seed = aShape.w;
  float x = p.x;
  float y = p.y;
  // across: the edges fold inward (toward -z), more toward the tip
  float z = -cup * x * x * (0.35 + 0.65 * y);
  // the edge and the tip ripple
  float edge = smoothstep(0.12, 0.45, abs(x)) + smoothstep(0.72, 1.0, y);
  z += ruf * (sin(x * 11.0 + seed * 6.2831 + y * 4.0) * 0.75 + sin(x * 23.0 - seed * 3.1 + y * 7.0) * 0.25) * edge * y;
  // along: the strip rolls round the x axis, tip in (k < 0) or back (k > 0)
  if (abs(k) < 0.001) return vec3(x, y, z);
  float a = k * y;
  float s = sin(a);
  float c = cos(a);
  return vec3(x, s / k, (1.0 - c) / k) + vec3(0.0, -s, c) * z;
}
`;

const BEND_NORMAL = /* glsl */ `
#include <beginnormal_vertex>
vec3 pdQ = petalDeform(position);
{
  vec3 pdX = petalDeform(position + vec3(0.006, 0.0, 0.0));
  vec3 pdY = petalDeform(position + vec3(0.0, 0.006, 0.0));
  objectNormal = normalize(cross(pdX - pdQ, pdY - pdQ));
}
`;

export interface PetalLook {
  /** palette A, base to tip, and palette B; aTone.x picks between them */
  a: [string, string, string];
  b: [string, string, string];
  edge: string;
  edgeAmt: number;
  vein: number;
  /** light through the petal, when the sun is behind it */
  back: number;
  roughness: number;
  sheen: number;
  clearcoat?: number;
  /** a ring of color at the base (an anemone's white eye) */
  mark?: string;
  markAmt?: number;
  /** how much paler the outside of the petal is */
  under?: number;
  /** the depth of the veins and the crinkle, as a share of the petal's length */
  relief?: number;
}

/** the sun as the petals see it, in view space; the director sets it each frame */
export const petalSun = {
  dir: { value: new THREE.Vector3(0, 0, 1) },
  color: { value: new THREE.Color("#ffffff") },
};

/** the tissue: main veins, finer ones between them, and a crinkle, all in the petal's own uv */
const RELIEF = /* glsl */ `
float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), f.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float petalVeins(vec2 uv, float seed) {
  float v = uv.y;
  float fan = (uv.x - 0.5) / (0.22 + v);
  // each set of veins fades out as it gets finer than a pixel, so nothing glitters
  float w = fwidth(fan);
  float main = pow(abs(sin(fan * 26.0 + seed * 3.0)), 8.0) * clamp(1.0 - w * 26.0 * 0.5, 0.0, 1.0);
  float fine = pow(abs(sin(fan * 58.0 + sin(v * 9.0 + seed * 6.0) * 0.7)), 4.0) * 0.32 * clamp(1.0 - w * 58.0 * 0.5, 0.0, 1.0);
  return (main + fine) * (1.0 - smoothstep(0.62, 1.0, v));
}
float petalCrinkle(vec2 uv, float seed) {
  return pNoise(vec2(uv.x * 9.0, uv.y * 16.0) + seed * 17.0) * 0.7 + pNoise(vec2(uv.x * 22.0, uv.y * 38.0) + seed * 5.0) * 0.3;
}
`;

export function petalMaterial(look: PetalLook) {
  const m = new THREE.MeshPhysicalMaterial({
    side: THREE.DoubleSide,
    roughness: look.roughness,
    metalness: 0,
    sheen: look.sheen,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(look.a[2]).lerp(new THREE.Color("#ffffff"), 0.2),
    clearcoat: look.clearcoat ?? 0,
    clearcoatRoughness: 0.3,
  });
  const c = (h: string) => new THREE.Color(h);
  const uniforms = {
    uA0: { value: c(look.a[0]) },
    uA1: { value: c(look.a[1]) },
    uA2: { value: c(look.a[2]) },
    uB0: { value: c(look.b[0]) },
    uB1: { value: c(look.b[1]) },
    uB2: { value: c(look.b[2]) },
    uEdge: { value: c(look.edge) },
    uEdgeAmt: { value: look.edgeAmt },
    uVein: { value: look.vein },
    uBack: { value: look.back },
    uMark: { value: c(look.mark || "#ffffff") },
    uMarkAmt: { value: look.markAmt || 0 },
    uUnder: { value: look.under ?? 0.25 },
    uRelief: { value: look.relief ?? 0.004 },
    uSunDir: petalSun.dir,
    uSunColor: petalSun.color,
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DEFORM}\nvarying vec2 vPetalUv;\nvarying vec4 vTone;\nvarying float vSeed;\nvarying float vLen;`)
      .replace("#include <beginnormal_vertex>", BEND_NORMAL)
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = pdQ;
vPetalUv = uv;
vTone = aTone;
vSeed = aShape.w;
#ifdef USE_INSTANCING
vLen = length(vec3(instanceMatrix[1]));
#else
vLen = 0.1;
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uA0; uniform vec3 uA1; uniform vec3 uA2;
uniform vec3 uB0; uniform vec3 uB1; uniform vec3 uB2;
uniform vec3 uEdge; uniform float uEdgeAmt; uniform float uVein; uniform float uBack;
uniform vec3 uMark; uniform float uMarkAmt; uniform float uUnder; uniform float uRelief;
uniform vec3 uSunDir; uniform vec3 uSunColor;
varying vec2 vPetalUv;
varying vec4 vTone;
varying float vSeed;
varying float vLen;
${RELIEF}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float pVeins = petalVeins(vPetalUv, vSeed);
float pCrink = petalCrinkle(vPetalUv, vSeed);
{
  float v = vPetalUv.y;
  float u = abs(vPetalUv.x * 2.0 - 1.0);
  vec3 pa = mix(mix(uA0, uA1, smoothstep(0.0, 0.42, v)), uA2, smoothstep(0.42, 1.0, v));
  vec3 pb = mix(mix(uB0, uB1, smoothstep(0.0, 0.42, v)), uB2, smoothstep(0.42, 1.0, v));
  vec3 col = mix(pa, pb, vTone.x);
  // a ring of its own color at the base
  col = mix(col, uMark, uMarkAmt * smoothstep(0.05, 0.11, v) * (1.0 - smoothstep(0.2, 0.3, v)));
  // the rim takes its own color, most at the tip
  col = mix(col, uEdge, uEdgeAmt * smoothstep(0.55, 1.0, max(u, v * v * 0.9 + u * 0.3)));
  // veins, and the color pooling unevenly in the tissue
  col *= 1.0 - uVein * smoothstep(0.25, 1.0, pVeins);
  col *= 0.93 + 0.14 * pNoise(vPetalUv * vec2(5.0, 9.0) + vSeed * 31.0);
  // the outside of a petal is paler and cooler than the side that faces in
  if (gl_FrontFacing) col = mix(col, vec3(dot(col, vec3(0.3, 0.45, 0.25))) * 1.1 + vec3(0.02, 0.01, 0.03), uUnder);
  // a bud still shows green on its outer petals
  col = mix(col, vec3(0.045, 0.11, 0.028), vTone.z * (0.45 + 0.55 * (1.0 - v)));
  // shade: the inner petals sit in the outer ones' shadow, and every petal darkens to its claw
  float occ = mix(1.0, 0.5, vTone.w) * mix(0.55, 1.0, smoothstep(0.0, 0.5, v));
  diffuseColor.rgb = col * vTone.y * occ;
}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
// velvet: the surface is a field of tiny cells, each catching the light a little differently
roughnessFactor = clamp(roughnessFactor * (0.9 + 0.2 * pNoise(vPetalUv * vec2(36.0, 70.0) + vSeed * 40.0)), 0.05, 1.0);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{
  // the veins stand up and the tissue crinkles: a height, read as a bump
  float hgt = (pVeins * 0.55 + pCrink * 0.45) * uRelief * vLen;
  vec2 dH = vec2(dFdx(hgt), dFdy(hgt));
  vec3 sx = dFdx(-vViewPosition);
  vec3 sy = dFdy(-vViewPosition);
  vec3 r1 = cross(sy, normal);
  vec3 r2 = cross(normal, sx);
  float det = dot(sx, r1) * faceDirection;
  vec3 g = sign(det) * (dH.x * r1 + dH.y * r2);
  normal = normalize(abs(det) * normal - g);
}`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
{
  // light through the petal from behind: thin tissue glows in the sun, the edges most
  float behind = max(0.0, dot(-normal, uSunDir));
  float thin = (0.55 + 0.45 * vPetalUv.y) * (1.0 + 0.7 * smoothstep(0.55, 1.0, abs(vPetalUv.x * 2.0 - 1.0)));
  reflectedLight.directDiffuse += diffuseColor.rgb * uSunColor * behind * uBack * thin * (0.85 + 0.3 * pVeins);
}`,
      );
  };
  m.customProgramCacheKey = () => "stamen-petal";
  return { material: m, uniforms };
}

/** the same bend for the shadow map, so shadows are the opening shapes */
export function petalDepthMaterial() {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DEFORM}`)
      .replace("#include <begin_vertex>", "vec3 transformed = petalDeform(position);");
  };
  m.customProgramCacheKey = () => "stamen-petal-depth";
  return m;
}

/** an instanced petal mesh with the per-petal shape and tone attributes */
export function petalMesh(geo: THREE.BufferGeometry, mat: THREE.Material, depth: THREE.Material, count: number) {
  const g = geo.clone();
  const shape = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const tone = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  shape.setUsage(THREE.DynamicDrawUsage);
  tone.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aShape", shape);
  g.setAttribute("aTone", tone);
  const mesh = new THREE.InstancedMesh(g, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.customDepthMaterial = depth;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.count = 0;
  return { mesh, shape, tone };
}
