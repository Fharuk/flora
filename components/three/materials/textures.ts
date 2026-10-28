import * as THREE from "three";

/**
 * Procedural micro-surface textures.
 *
 * Glass and ceramic without micro-detail read as CG: perfect specular streaks, no breakup.
 * These are generated as DataTextures at load (no network, no assets) and used as a normal
 * map plus a roughness variation map. Tileable by construction — the noise is sampled on a
 * torus so the edges meet.
 */

const SIZE = 256;

function tileableNoise(x: number, y: number, freq: number, seed: number): number {
  // sample noise on a torus so the field wraps seamlessly
  const a = (x / SIZE) * Math.PI * 2;
  const b = (y / SIZE) * Math.PI * 2;
  const r = 1 + Math.cos(b) * 0.5;
  const px = Math.cos(a) * r + seed * 7.31;
  const py = Math.sin(a) * r + seed * 3.17;
  const pz = Math.sin(b) + seed * 11.7;

  const v = Math.sin(px * freq) * Math.sin(py * freq * 1.13) * Math.sin(pz * freq * 0.87);
  return v * 0.5 + 0.5;
}

function fbm(x: number, y: number, seed: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 2.4;
  for (let i = 0; i < 4; i++) {
    v += tileableNoise(x, y, f, seed + i * 1.7) * amp;
    f *= 2.07;
    amp *= 0.5;
  }
  return v;
}

/** A barely-there surface normal map: gives specular highlights a grain. */
export function createNoiseNormalMap(strength = 0.55): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  const height = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      height[y * SIZE + x] = fbm(x, y, 1.0);
    }
  }

  const at = (x: number, y: number) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * SIZE + x) * 4;
      data[i] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** Roughness variation so highlights break up along a petal instead of banding. */
export function createRoughnessMap(): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = Math.round(128 + (fbm(x, y, 4.2) - 0.5) * 150);
      const i = (y * SIZE + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

let normalCache: THREE.DataTexture | null = null;
let roughCache: THREE.DataTexture | null = null;

export function noiseNormalMap() {
  if (!normalCache) normalCache = createNoiseNormalMap();
  return normalCache;
}

export function noiseRoughnessMap() {
  if (!roughCache) roughCache = createRoughnessMap();
  return roughCache;
}
