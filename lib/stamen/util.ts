// Small shared helpers: seeded randomness, easing, clamping.

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const smoother = (t: number) => {
  t = clamp(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
/** 0 before a, 1 after b, smooth between. */
export const band = (v: number, a: number, b: number) => smooth((v - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** mulberry32: small, fast, seeded. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isPhone = () =>
  typeof window !== "undefined" &&
  (window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches);

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 1D value noise, smooth, for wobble. */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin((n + seed * 57.13) * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}
