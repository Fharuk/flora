/**
 * The bouquet engine.
 *
 * A bouquet is fully determined by a short URL-safe config: a seed, up to five species
 * codes, a palette, an arrangement, a vessel and a density. Nothing is stored server-side
 * — the link *is* the bouquet. Regenerating with a new seed produces a new arrangement of
 * the same species, which is how "generate" stays interesting without an account.
 */

import {
  arrangements,
  paletteKeys,
  specimens,
  specimenBySlug,
  type Arrangement,
  type PaletteKey,
  type Vessel,
} from "./specimens";

export type BouquetConfig = {
  seed: number;
  species: string[];
  palette: PaletteKey;
  arrangement: Arrangement;
  vessel: Vessel;
  /** number of stems, 3–11 */
  density: number;
  /** 0–1, how far the flowers have opened */
  bloom: number;
};

export type Stem = {
  id: number;
  species: string;
  /** base of the stem, at the vessel mouth */
  origin: [number, number, number];
  /** direction the stem leans, radians around Y */
  azimuth: number;
  /** outward lean from vertical, radians */
  lean: number;
  length: number;
  scale: number;
  /** rotation of the head about its own stem axis */
  roll: number;
  /** slight curve in the stem, -1..1 */
  bow: number;
};

export const SPECIES_CODE: Record<string, string> = {
  "ghost-orchid": "gh",
  "king-protea": "kp",
  "gloriosa-lily": "gl",
  "bird-of-paradise": "bp",
  "black-hellebore": "bh",
  "cymbidium-orchid": "cy",
  "cafe-au-lait-dahlia": "da",
  "titan-arum": "ta",
  "persian-ranunculus": "ra",
  "velvet-anthurium": "va",
};

const CODE_SPECIES = Object.fromEntries(Object.entries(SPECIES_CODE).map(([k, v]) => [v, k]));

export const DEFAULT_CONFIG: BouquetConfig = {
  seed: 20831,
  species: ["ghost-orchid", "cafe-au-lait-dahlia", "velvet-anthurium"],
  palette: "frost",
  arrangement: "spiral",
  vessel: "bulb",
  density: 7,
  bloom: 0.86,
};

/* ------------------------------------------------------------------- random */

/** mulberry32 — small, fast, deterministic. */
export function makeRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = () => Math.floor(Math.random() * 0xffffff);

/* -------------------------------------------------------------------- encode */

const PALETTE_CODE = { frost: "f", chrome: "c", amber: "a", noir: "n" } as const;
const CODE_PALETTE = Object.fromEntries(Object.entries(PALETTE_CODE).map(([k, v]) => [v, k])) as Record<
  string,
  PaletteKey
>;
const ARRANGEMENT_CODE = { spiral: "s", wild: "w", arch: "a", solitaire: "o" } as const;
const CODE_ARRANGEMENT = Object.fromEntries(
  Object.entries(ARRANGEMENT_CODE).map(([k, v]) => [v, k])
) as Record<string, Arrangement>;
const VESSEL_CODE = { bulb: "b", flute: "f", tide: "t" } as const;
const CODE_VESSEL = Object.fromEntries(Object.entries(VESSEL_CODE).map(([k, v]) => [v, k])) as Record<
  string,
  Vessel
>;

export function encodeBouquet(config: BouquetConfig): string {
  const params = new URLSearchParams();
  params.set("seed", config.seed.toString(36));
  params.set("f", config.species.map((s) => SPECIES_CODE[s] ?? s).join("-"));
  params.set("p", PALETTE_CODE[config.palette] ?? "f");
  params.set("a", ARRANGEMENT_CODE[config.arrangement] ?? "s");
  params.set("v", VESSEL_CODE[config.vessel] ?? "b");
  params.set("d", String(config.density));
  params.set("b", String(Math.round(config.bloom * 100)));
  return params.toString();
}

export function decodeBouquet(input: string | URLSearchParams): BouquetConfig {
  const params = typeof input === "string" ? new URLSearchParams(input.replace(/^\?/, "")) : input;

  const seedRaw = params.get("seed");
  const seed = seedRaw ? Math.abs(parseInt(seedRaw, 36)) || DEFAULT_CONFIG.seed : DEFAULT_CONFIG.seed;

  const species = (params.get("f") ?? "")
    .split("-")
    .map((code) => CODE_SPECIES[code] ?? code)
    .filter((slug) => specimenBySlug.has(slug))
    .slice(0, 5);
  if (!species.length) species.push(...DEFAULT_CONFIG.species);

  const palette = CODE_PALETTE[params.get("p") ?? ""] ?? DEFAULT_CONFIG.palette;
  const arrangement = CODE_ARRANGEMENT[params.get("a") ?? ""] ?? DEFAULT_CONFIG.arrangement;
  const vessel = CODE_VESSEL[params.get("v") ?? ""] ?? DEFAULT_CONFIG.vessel;

  const density = clampInt(parseInt(params.get("d") ?? "", 10) || DEFAULT_CONFIG.density, 3, 11);
  const bloomRaw = parseFloat(params.get("b") ?? "");
  const bloom = Number.isFinite(bloomRaw) ? Math.min(1, Math.max(0.15, bloomRaw / 100)) : DEFAULT_CONFIG.bloom;

  return { seed, species, palette, arrangement, vessel, density, bloom };
}

const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

/* --------------------------------------------------------------- composition */

/**
 * Turns a config into concrete stem transforms.
 * Pure function of the config — same URL always yields the same bouquet.
 */
export function composeBouquet(config: BouquetConfig): Stem[] {
  const rand = makeRandom(config.seed || 1);
  const stems: Stem[] = [];
  const count = config.arrangement === "solitaire" ? 1 : config.density;
  const chosen = config.species.length ? config.species : DEFAULT_CONFIG.species;

  // weights make larger specimens appear less often, so the bouquet keeps a hierarchy
  const weighted: string[] = [];
  for (const slug of chosen) {
    const spec = specimenBySlug.get(slug);
    if (!spec) continue;
    const copies = Math.max(1, Math.round(4 / spec.weight));
    for (let i = 0; i < copies; i++) weighted.push(slug);
  }

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const mouthY = 1.32;

  for (let i = 0; i < count; i++) {
    const species = weighted[Math.floor(rand() * weighted.length)] ?? chosen[0];
    const spec = specimenBySlug.get(species)!;
    const t = count === 1 ? 0 : i / (count - 1);

    let azimuth = 0;
    let lean = 0;
    let length = 1.9;
    let radial = 0;

    if (config.arrangement === "spiral") {
      azimuth = i * GOLDEN + rand() * 0.25;
      radial = 0.045 * Math.sqrt(i + 1) + rand() * 0.015;
      lean = 0.07 + t * 0.34 + (rand() - 0.5) * 0.05;
      length = 1.55 - t * 0.4 + (rand() - 0.5) * 0.14;
    } else if (config.arrangement === "wild") {
      azimuth = rand() * Math.PI * 2;
      radial = 0.03 + rand() * 0.09;
      lean = 0.06 + rand() * 0.42;
      length = 1.25 + rand() * 0.85;
      // a single leader stem, taller than the rest
      if (i === 0) {
        lean = 0.03;
        length = 2.35;
      }
    } else if (config.arrangement === "arch") {
      const a = Math.PI * 0.25 + t * Math.PI * 0.62;
      azimuth = a;
      radial = 0.02 + Math.sin(t * Math.PI) * 0.07;
      lean = 0.22 + Math.sin(t * Math.PI) * 0.6;
      length = 1.45 + Math.sin(t * Math.PI) * 0.75;
    }

    // heavier flowers sit lower and lean further out
    const weightPenalty = (spec.weight - 1) * 0.12;
    length *= 1 - Math.min(0.35, weightPenalty);

    stems.push({
      id: i,
      species,
      origin: [Math.cos(azimuth) * radial, mouthY, Math.sin(azimuth) * radial],
      azimuth,
      lean: lean + Math.min(0.2, weightPenalty),
      length,
      scale: (0.72 + rand() * 0.3) * (1 - Math.min(0.18, weightPenalty * 0.4)),
      roll: rand() * Math.PI * 2,
      bow: (rand() - 0.5) * 1.4,
    });
  }

  // sort so painter's ordering stays stable frame to frame
  return stems.sort((a, b) => a.origin[2] - b.origin[2]);
}

/** Vessel dimensions, shared by the vase mesh and the stem origins. */
export const vesselProfile = {
  bulb: { height: 1.45, mouth: 0.42, belly: 0.72 },
  flute: { height: 2.15, mouth: 0.3, belly: 0.5 },
  tide: { height: 0.85, mouth: 0.66, belly: 0.78 },
} satisfies Record<Vessel, { height: number; mouth: number; belly: number }>;

/* -------------------------------------------------------------------- naming */

const ADJECTIVES = [
  "Quiet", "Late", "Silver", "Nocturnal", "Patient", "Pale", "Hollow", "Warm",
  "Still", "Opaline", "Velvet", "Feral", "Hushed", "Winter", "Amber", "Glass",
];
const NOUNS = [
  "Reliquary", "Vigil", "Interval", "Tide", "Study", "Hour", "Remainder", "Bloom",
  "Silence", "Weather", "Reverie", "Specimen", "Keepsake", "Composition", "Archive",
];

/** A stable two-word title derived from the seed — used in captions and OG images. */
export function bouquetTitle(config: BouquetConfig): string {
  const rand = makeRandom(config.seed ^ 0x9e3779b9);
  const a = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(rand() * NOUNS.length)];
  return `${a} ${n}`;
}

export function bouquetCode(config: BouquetConfig): string {
  return `${config.vessel.slice(0, 1).toUpperCase()}${config.seed.toString(36).toUpperCase().slice(0, 5)}`;
}

export type { Arrangement, PaletteKey, Vessel };
export { specimens, arrangements, palettes as paletteList, paletteKeys } from "./specimens";
