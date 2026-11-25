/**
 * The share card's specimen.
 *
 * Satori, the renderer behind `next/og`, draws boxes, text and images but has no
 * shaders, and a flat vector bloom reads as a sticker rather than as the film's
 * glass. So the bloom is rasterised here instead: a small procedural SVG with a
 * real light rig, rendered by sharp (already a Next dependency, no new package)
 * and handed to satori as a PNG data URI.
 *
 * Everything is a pure function of the bouquet config, so the URL that opens a
 * bouquet in the browser also decides the card's species, colours and petal
 * count. No model file, no image asset, no browser.
 *
 * Two rules learned the hard way:
 *   - librsvg ignores `mix-blend-mode`, so every light is painted as plain
 *     alpha compositing, never as screen or multiply.
 *   - the ground is drawn here, not left transparent. A transparent specimen
 *     over a cream card is a pale flower on a pale field.
 */

import sharp from "sharp";

import { composeBouquet, type BouquetConfig } from "@/lib/bouquet";
import { getSpecimen } from "@/lib/hybrids";
import { palettes } from "@/lib/specimens";

/** The art panel: the right half of a 1200x630 card, bleeding off three edges. */
export const ART_W = 640;
export const ART_H = 630;
const HERO = { x: 316, y: 356 };
const HERO_R = 292;

const r2 = (n: number) => Math.round(n * 100) / 100;
const deg = (rad: number) => (rad * 180) / Math.PI;

/* ---------------------------------------------------------------- colour */

function hex(color: string) {
  const h = color.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Mixes two hex colours; `t` 0 returns a, 1 returns b. */
function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const c = [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t].map((v) =>
    Math.max(0, Math.min(255, Math.round(v)))
  );
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Perceived lightness 0..1. Used to pick a subject that can carry a dark card. */
function luminance(color: string) {
  const [r, g, b] = hex(color).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* ---------------------------------------------------------------- geometry */

/**
 * One petal: base at the origin, tip 1 unit up, so the caller scales by length
 * alone. `halfWidth` is a share of that length. The silhouette is the film's own
 * `spoon` outline sampled into a cubic, with a soft notch at the tip.
 */
function petalPath(halfWidth: number, notch = 0): string {
  const w = Math.max(0.05, halfWidth);
  const tip = 1 - notch * 0.2;
  return (
    `M0 0` +
    `C${r2(-w * 1.08)} -0.16 ${r2(-w * 1.04)} -0.58 ${r2(-w * 0.52)} -${r2(tip * 0.92)}` +
    `Q0 -${r2(tip)} ${r2(w * 0.52)} -${r2(tip * 0.92)}` +
    `C${r2(w * 1.04)} -0.58 ${r2(w * 1.08)} -0.16 0 0Z`
  );
}

/** The deepest bloom in the bunch: on a night ground the pale heads disappear. */
function heroOf(config: BouquetConfig) {
  const stems = composeBouquet(config);
  const seen = new Set<string>();
  let best = config.species[0];
  let score = Infinity;
  for (const stem of stems) {
    if (seen.has(stem.species)) continue;
    seen.add(stem.species);
    const spec = getSpecimen(stem.species);
    if (!spec) continue;
    const l = luminance(spec.colours.petal[1]);
    if (l < score) {
      score = l;
      best = stem.species;
    }
  }
  return getSpecimen(best) ?? getSpecimen("peony")!;
}

type Ring = { count: number; radius: number; width: number; rotation: number; fill: string; edge: string };

/**
 * Ring counts are fixed, not derived. A head needs enough petals to close the
 * ring and no more: seven outer and five inner reads as a bowl at any size, and
 * it cannot run away to a hundred petals when a species says "38".
 */
function ringsFor(spec: NonNullable<ReturnType<typeof getSpecimen>>, radius: number): Ring[] {
  const [edge, core] = spec.colours.petal;
  const wide = spec.petals.width * 0.78;
  return [
    {
      count: spec.petals.count <= 8 ? spec.petals.count : 7,
      radius,
      width: wide,
      rotation: spec.petals.twist * 24,
      fill: edge,
      edge: core,
    },
    {
      count: 5,
      radius: radius * 0.54,
      width: wide * 0.92,
      rotation: spec.petals.twist * 24 + 36,
      fill: mix(edge, core, 0.55),
      edge: core,
    },
  ];
}

/**
 * One bloom at (x, y). Its gradients are returned separately from its shapes:
 * librsvg resolves paint servers in document order, so every gradient has to be
 * in the tree before the path that paints with it.
 */
function bloom(
  spec: NonNullable<ReturnType<typeof getSpecimen>>,
  x: number,
  y: number,
  radius: number,
  key: number
): { defs: string; body: string } {
  const rings = ringsFor(spec, radius);
  const id = `b${Math.round(x)}_${Math.round(y)}`;
  const notch = spec.form === "spray" ? 0 : 0.26;
  const defs: string[] = [];
  const body: string[] = [];
  let n = 0;

  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const angle = deg((i / ring.count) * Math.PI * 2 + ring.rotation);
      const d = petalPath(ring.width, notch);
      const gid = `${id}_${n++}`;
      defs.push(
        // userSpaceOnUse: the petal's own space runs from its base (0,0) to its
        // tip (0,-1), so the stops land on the shape instead of off its bbox
        `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="-1">` +
          `<stop offset="0" stop-color="${mix(ring.fill, "#120508", 0.55)}"/>` +
          `<stop offset="0.28" stop-color="${mix(ring.fill, "#120508", 0.22)}"/>` +
          `<stop offset="0.62" stop-color="${ring.fill}"/>` +
          `<stop offset="0.88" stop-color="${mix(ring.fill, ring.edge, 0.4)}"/>` +
          `<stop offset="1" stop-color="${mix(ring.fill, "#fff2dd", 0.4)}"/>` +
          `</linearGradient>`
      );
      /*
       * The outline is inside the petal's own scale, so its width has to be
       * divided by that scale. Left in pixels it was a 1.6 stroke magnified to
       * 150, which laid a grey slab over every pale bloom.
       */
      const pale = luminance(ring.fill) > 0.62;
      body.push(
        `<path d="${d}" transform="translate(${x} ${y}) rotate(${r2(angle)}) ` +
          `scale(${r2(ring.radius)} ${r2(ring.radius)})" fill="url(#${gid})" ` +
          `stroke="${pale ? "#3a2226" : mix(ring.edge, "#fff2dd", 0.35)}" ` +
          `stroke-opacity="${pale ? 0.3 : 0.3}" ` +
          `stroke-width="${r2((pale ? 1.5 : 0.8) / ring.radius)}"/>`
      );
    }
  }

  // the heart: a shaded disc with the kit's ring of gold anthers
  const heart = rings[1].radius * 0.3;
  defs.push(
    `<radialGradient id="${id}_heart" cx="0.42" cy="0.34" r="0.66">` +
      `<stop offset="0" stop-color="${mix(spec.colours.core, "#fff2dd", 0.22)}"/>` +
      `<stop offset="0.6" stop-color="${mix(spec.colours.core, "#120508", 0.34)}"/>` +
      `<stop offset="1" stop-color="${mix(spec.colours.core, "#120508", 0.7)}"/>` +
      `</radialGradient>`
  );
  body.push(`<circle cx="${x}" cy="${y}" r="${r2(heart)}" fill="url(#${id}_heart)"/>`);

  const beads = spec.form === "spray" ? 12 : 20;
  for (let i = 0; i < beads; i++) {
    const a = (i / beads) * Math.PI * 2 + key;
    const rr = heart * (0.3 + (i % 3) * 0.24);
    const bx = x + Math.cos(a) * rr;
    const by = y + Math.sin(a) * rr;
    body.push(
      `<circle cx="${r2(bx)}" cy="${r2(by)}" r="${r2(2 + (i % 4) * 0.45)}" fill="#d8ab54"/>` +
        `<circle cx="${r2(bx - 0.7)}" cy="${r2(by - 0.7)}" r="0.9" fill="#fff4e2"/>`
    );
  }

  return { defs: defs.join(""), body: body.join("") };
}

function bloomSvg(config: BouquetConfig) {
  const palette = palettes[config.palette];
  const wash = mix(palette.swatch[1], "#9e2b3e", 0.62);

  /*
   * Three heads, not one. A single enormous bloom filled the panel and left the
   * type beside it with nothing to answer; a small cluster is also what the
   * film's own plates show, so the card and the page agree.
   */
  const stems = composeBouquet(config);
  const seen: string[] = [];
  for (const stem of stems) {
    if (!seen.includes(stem.species)) seen.push(stem.species);
  }
  const cast = seen
    .slice(0, 3)
    .map((slug) => getSpecimen(slug))
    .filter(Boolean) as NonNullable<ReturnType<typeof getSpecimen>>[];
  while (cast.length < 3) cast.push(getSpecimen("peony")!);

  /*
   * The palest head sits at the back and the deepest in front. Inverted, a ghost
   * orchid in the foreground bleached the panel and the card lost its subject.
   */
  const byLight = [...cast].sort((a, b) => luminance(a.colours.petal[1]) - luminance(b.colours.petal[1]));
  const pale = byLight[2] ?? byLight[0];
  const middle = byLight[1] ?? byLight[0];
  const deep = byLight[0];

  const blooms = [
    bloom(pale, ART_W * 0.24, ART_H * 0.36, 96, 0.6),
    bloom(middle, ART_W * 0.76, ART_H * 0.42, 88, 1.4),
    bloom(deep, ART_W * 0.46, ART_H * 0.62, 126, 2.2),
  ];

  /* Stems and the wrap: without them three heads read as a pattern, not a
   * bouquet. Both are drawn before the blooms so the heads sit over them. */
  const mouthX = ART_W * 0.44;
  const mouthY = ART_H * 1.04;
  const stemLines = blooms
    .map((b, i) => {
      const tx = [ART_W * 0.24, ART_W * 0.76, ART_W * 0.46][i];
      const ty = [ART_H * 0.36, ART_H * 0.42, ART_H * 0.62][i];
      const cx = (mouthX + tx) / 2 + (i === 1 ? 26 : i === 0 ? -18 : 4);
      return (
        `<path d="M${r2(mouthX)} ${r2(mouthY)} Q${r2(cx)} ${r2((mouthY + ty) / 2)} ${r2(tx)} ${r2(ty)}" ` +
        `fill="none" stroke="#7f9d8b" stroke-opacity="0.55" stroke-width="3.4" stroke-linecap="round"/>`
      );
    })
    .join("");

  /*
   * Every paint server is declared here, before any shape that uses it. Declared
   * inline, the gradients landed after their own paths and librsvg painted the
   * petals black, which is exactly what happened on the first three attempts.
   */
  const defs =
    `<radialGradient id="ground" cx="0.46" cy="0.46" r="0.86">` +
    `<stop offset="0" stop-color="${mix(wash, "#3c1a20", 0.5)}"/>` +
    `<stop offset="0.54" stop-color="#2f151b"/>` +
    `<stop offset="1" stop-color="#170a0e"/>` +
    `</radialGradient>` +
    `<radialGradient id="key" cx="0.14" cy="0.06" r="0.86">` +
    `<stop offset="0" stop-color="#ffe7c6" stop-opacity="0.22"/>` +
    `<stop offset="0.4" stop-color="#ffe7c6" stop-opacity="0.05"/>` +
    `<stop offset="1" stop-color="#ffe7c6" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="bounce" cx="0.86" cy="1" r="0.64">` +
    `<stop offset="0" stop-color="#9e2b3e" stop-opacity="0.34"/>` +
    `<stop offset="1" stop-color="#9e2b3e" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<linearGradient id="seam" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#1a0a0f"/>` +
    `<stop offset="0.55" stop-color="#1a0a0f" stop-opacity="0.82"/>` +
    `<stop offset="1" stop-color="#1a0a0f" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="#0a0205" stop-opacity="0.85"/>` +
    `<stop offset="0.55" stop-color="#0a0205" stop-opacity="0.45"/>` +
    `<stop offset="1" stop-color="#0a0205" stop-opacity="0"/>` +
    `</radialGradient>` +
    blooms.map((b) => b.defs).join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_W} ${ART_H}" width="${ART_W}" height="${ART_H}">` +
    `<defs>${defs}</defs>` +
    `<rect width="${ART_W}" height="${ART_H}" fill="url(#ground)"/>` +
    // one pool of shadow under the cluster so the stems stand on something;
    // a gradient ellipse, because a blurred child packs the whole filter box
    `<ellipse cx="${ART_W * 0.44}" cy="${ART_H * 1.0}" rx="${ART_W * 0.42}" ry="60" fill="url(#pool)"/>` +
    stemLines +
    blooms.map((b) => b.body).join("") +
    `<rect width="${ART_W}" height="${ART_H}" fill="url(#key)"/>` +
    `<rect width="${ART_W}" height="${ART_H}" fill="url(#bounce)"/>` +
    // the left edge dissolves into the card's own plum, so the two halves read
    // as one picture rather than two panels pushed together
    `<rect width="104" height="${ART_H}" fill="url(#seam)"/>` +
    `</svg>`
  );
}

/** Exposed for local inspection of the generated artwork. */
export function debugSvg(config: BouquetConfig) {
  return bloomSvg(config);
}

/** Rasterises the card's specimen to PNG bytes, at 2x for retina timelines. */
export async function specimenPng(config: BouquetConfig): Promise<Buffer> {
  return sharp(Buffer.from(bloomSvg(config)), { density: 192 })
    .resize(ART_W * 2, ART_H * 2)
    .png({ compressionLevel: 9, effort: 6 })
    .toBuffer();
}
