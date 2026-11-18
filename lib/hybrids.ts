/**
 * The breeding engine.
 *
 * Two specimens are crossed into a hybrid that is itself a full `Specimen` — same shape,
 * same renderer, no special cases downstream. Everything about the child is derived from
 * `(parentA, parentB, seed)`, so the hybrid's slug is a complete recipe: a bouquet can carry
 * a hybrid in its URL and any browser can rebuild it identically without asking a server.
 *
 * The database only ever stores a *registry* of discovered hybrids, for the herbarium feed.
 * It is not required to render one.
 */

import {
  CODE_SPECIES,
  SPECIES_CODE,
  specimens,
  type Form,
  type Finish,
  type Rarity,
  type Specimen,
} from "./specimens";

export type HybridRef = { a: string; b: string; seed: number };

export type Hybrid = Specimen & {
  isHybrid: true;
  parents: [string, string];
  rarity: Rarity;
  /** 0–1, how far the child sits from the midpoint of its parents */
  divergence: number;
};

const HYBRID_PREFIX = "x";
const cache = new Map<string, Hybrid>();

/* ------------------------------------------------------------------- helpers */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const toHex = (v: number) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, "0");

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `#${toHex(lerp(ar, br, t))}${toHex(lerp(ag, bg, t))}${toHex(lerp(ab, bb, t))}`;
}

function colourDistance(a: string, b: string): number {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2) / 441.67;
}

/* -------------------------------------------------------------------- naming */

const EPITHETS = [
  "Nocturne", "Vespers", "Emberlight", "Halcyon", "Solstice", "Penumbra", "Aurora",
  "Reverie", "Cinder", "Lumen", "Vesper", "Eclipse", "Verdant", "Obsidian", "Quietus",
  "Anthesis", "Requiem", "Hollow Star", "Sable", "Meridian",
];

const GENERA: Record<string, string> = {
  "ghost-orchid": "Dendrophylax",
  "cymbidium-orchid": "Cymbidium",
  "king-protea": "Protea",
  "gloriosa-lily": "Gloriosa",
  "bird-of-paradise": "Strelitzia",
  "black-hellebore": "Helleborus",
  "cafe-au-lait-dahlia": "Dahlia",
  "titan-arum": "Amorphophallus",
  "persian-ranunculus": "Ranunculus",
  "velvet-anthurium": "Anthurium",
};

const BOTANIC: Record<string, string> = {
  "ghost-orchid": "Orchidaceae",
  "cymbidium-orchid": "Orchidaceae",
  "king-protea": "Proteaceae",
  "gloriosa-lily": "Colchicaceae",
  "bird-of-paradise": "Strelitziaceae",
  "black-hellebore": "Ranunculaceae",
  "cafe-au-lait-dahlia": "Asteraceae",
  "titan-arum": "Araceae",
  "persian-ranunculus": "Ranunculaceae",
  "velvet-anthurium": "Araceae",
};

const head = (name: string) => name.split(" ")[0];
const tail = (name: string) => name.split(" ").slice(-1)[0];

function commonName(a: Specimen, b: Specimen, epithet: string): string {
  const left = head(a.name);
  const right = tail(b.name).toLowerCase();
  if (head(a.name).toLowerCase() === right.toLowerCase()) return `${left} '${epithet}'`;
  return `${left} ${right} '${epithet}'`;
}

/* ---------------------------------------------------------------- the crossing */

const FORMS: Form[] = ["spiral", "cup", "spray", "spike", "spathe", "fan"];
const FINISHES: Finish[] = ["glass", "chrome", "porcelain", "iridescent"];

/**
 * A child inherits one parent's architecture (you cannot average a spathe into a fan and
 * still get a flower), but its surface, colour and proportions are genuinely mixed — which
 * is what makes the results read as new species rather than recolours.
 */
export function breedHybrid(a: Specimen, b: Specimen, seed: number): Hybrid {
  const rand = rng(seed ^ hash(a.slug + b.slug));
  const pick = <T,>(options: T[]): T => options[Math.floor(rand() * options.length)];

  // ---- architecture: one donor wins the body plan, the other nudges it
  const bodyDonor = rand() < 0.5 ? a : b;
  const traitDonor = bodyDonor === a ? b : a;
  const formRoll = rand();
  let form: Form = bodyDonor.form;
  if (formRoll > 0.86) form = pick(FORMS); // a genuine sport — rare

  const finishRoll = rand();
  const finish: Finish =
    finishRoll < 0.45 ? a.finish : finishRoll < 0.9 ? b.finish : pick(FINISHES);

  // ---- proportions
  const pa = a.petals;
  const pb = b.petals;
  const t = 0.35 + rand() * 0.4; // bias toward the body donor

  const petals = {
    count: Math.round(lerp(pa.count, pb.count, t) * (0.9 + rand() * 0.3)),
    layers: Math.max(1, Math.round(lerp(pa.layers, pb.layers, t))),
    length: lerp(pa.length, pb.length, t) * (0.94 + rand() * 0.16),
    width: lerp(pa.width, pb.width, t) * (0.94 + rand() * 0.16),
    cup: clamp01(lerp(pa.cup, pb.cup, t) + (rand() - 0.5) * 0.18),
    curl: lerp(pa.curl, pb.curl, t) + (rand() - 0.5) * 0.24,
    twist: lerp(pa.twist, pb.twist, t) + (rand() - 0.5) * 0.2,
    rise: lerp(pa.rise, pb.rise, t),
    spread: lerp(pa.spread, pb.spread, t),
  };

  // ---- pigment
  const colourT = 0.3 + rand() * 0.5;
  const petalA = mixHex(a.colours.petal[0], b.colours.petal[0], colourT);
  const petalB = mixHex(a.colours.petal[1], b.colours.petal[1], colourT);
  const core = mixHex(a.colours.core, b.colours.core, rand());
  const stem = mixHex(a.colours.stem, b.colours.stem, 0.5);

  // ---- rarity from how far the child travelled from its parents
  // Normalised against the sum of the weights, not clamped to 1: the components can add to
  // 1.5, so clamping saturated nearly every cross at "maximum divergence".
  const divergence =
    clamp01(
      (Math.abs(pa.count - pb.count) / 12) * 0.3 +
        (colourDistance(a.colours.petal[0], b.colours.petal[0]) || 0) * 0.35 +
        (a.form !== b.form ? 0.2 : 0) +
        (a.finish !== b.finish ? 0.1 : 0) +
        (BOTANIC[a.slug] !== BOTANIC[b.slug] ? 0.15 : 0) +
        (form !== bodyDonor.form ? 0.25 : 0)
    ) / 1.5;

  /**
   * Rarity is not divergence.
   *
   * The first version tiered the child on divergence alone, which put almost every cross in
   * legendary or mythic — the scale saturated and the badge stopped carrying information.
   * Divergence now contributes most of the score, but a little luck is required on top, so a
   * genuinely novel cross can still come out merely rare, and mythic stays rare enough to
   * mean something.
   */
  const score = divergence * 0.85 + rand() * 0.2;
  const rarity: Rarity =
    score > 0.72 ? "mythic" : score > 0.6 ? "legendary" : score > 0.48 ? "exotic" : score > 0.36 ? "rare" : "common";

  const epithet = pick(EPITHETS);
  const genusA = GENERA[a.slug] ?? a.latin.split(" ")[0];
  const genusB = GENERA[b.slug] ?? b.latin.split(" ")[0];
  const latin = `${genusA} × ${genusB.toLowerCase()} '${epithet}'`;

  const hybrid: Hybrid = {
    slug: hybridSlug(a.slug, b.slug, seed),
    name: commonName(bodyDonor, traitDonor, epithet),
    latin,
    family: `× ${BOTANIC[a.slug] ?? a.family}`,
    origin: "Cultivated in the browser",
    blurb: `A first-generation cross between ${a.name} and ${b.name}. The ${bodyDonor.form} architecture came from ${bodyDonor.name}; ${traitDonor.name} contributes its ${traitDonor.finish} surface. Breed it again with a new seed and you get a sibling, not a copy.`,
    note: `${bodyDonor.finish} body · ${traitDonor.form} influence`,
    form,
    finish,
    petals,
    spike: bodyDonor.spike,
    colours: { petal: [petalA, petalB], core, stem },
    bloom: bodyDonor.bloom,
    weight: lerp(a.weight, b.weight, t) * (0.85 + rand() * 0.3),
    isHybrid: true,
    parents: [a.slug, b.slug],
    rarity,
    divergence,
  };

  return hybrid;
}

/* ------------------------------------------------------------------ the slugs */

/**
 * `x_gh_va_1f3k` — parent codes plus the seed, which together are the whole recipe.
 *
 * Underscores, not dashes: the bouquet URL joins its species list with dashes
 * (`f=gh-da-va`), so a dashed hybrid slug could not be split back out unambiguously.
 */
export function hybridSlug(a: string, b: string, seed: number): string {
  const ca = SPECIES_CODE[a] ?? a.slice(0, 2);
  const cb = SPECIES_CODE[b] ?? b.slice(0, 2);
  return `${HYBRID_PREFIX}_${ca}_${cb}_${(seed >>> 0).toString(36)}`;
}

export function parseHybridSlug(slug: string): HybridRef | null {
  const parts = slug.split("_");
  if (parts.length !== 4 || parts[0] !== HYBRID_PREFIX) return null;
  const a = CODE_SPECIES[parts[1]];
  const b = CODE_SPECIES[parts[2]];
  if (!a || !b) return null;
  const seed = parseInt(parts[3], 36);
  if (!Number.isFinite(seed)) return null;
  return { a, b, seed };
}

export function isHybridSlug(slug: string): boolean {
  return slug.startsWith(`${HYBRID_PREFIX}_`);
}

/* ---------------------------------------------------------------- resolution */

/**
 * The single lookup the whole app uses. Base species return themselves; hybrid slugs are
 * bred on demand and memoised, so a bouquet of hybrid stems costs one crossing per species.
 */
export function getSpecimen(slug: string): Specimen | Hybrid | undefined {
  const base = specimens.find((s) => s.slug === slug);
  if (base) return base;
  return getHybrid(slug) ?? undefined;
}

export function getHybrid(slug: string): Hybrid | null {
  const cached = cache.get(slug);
  if (cached) return cached;
  const ref = parseHybridSlug(slug);
  if (!ref) return null;
  const a = specimens.find((s) => s.slug === ref.a);
  const b = specimens.find((s) => s.slug === ref.b);
  if (!a || !b) return null;
  const hybrid = breedHybrid(a, b, ref.seed);
  cache.set(slug, hybrid);
  return hybrid;
}

export function hybridRarity(hybrid: Hybrid): Rarity {
  return hybrid.rarity;
}

/** Every unordered pair of specimens — the full breeding grid is 45 crosses. */
export function breedingPairs(): [Specimen, Specimen][] {
  const pairs: [Specimen, Specimen][] = [];
  for (let i = 0; i < specimens.length; i++) {
    for (let j = i + 1; j < specimens.length; j++) pairs.push([specimens[i], specimens[j]]);
  }
  return pairs;
}
