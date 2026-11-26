/**
 * Greenery.
 *
 * The bouquet used to be blooms and a vessel, which is a florist's bunch but not a
 * composition: flowers alone have nothing to sit against. Foliage is what gives a
 * bouquet its silhouette — the dark, matte, cheap material that makes the glass read
 * as expensive by contrast.
 *
 * These are five foliage archetypes, each a recipe rather than a model. Like the
 * specimens, every leaf is generated from numbers, so a spray costs no download and
 * resolves at any size. The recipes differ in the things that actually distinguish
 * one greenery from another: leaf shape, how many leaves a stem carries, whether they
 * sit in opposite pairs or spiral, and whether the stem arches or stands.
 *
 * Composition lives here, apart from the geometry, so the same spray is described
 * identically whether it is being drawn in 3D, listed in the card step, or counted in
 * the share metadata.
 */

import { makeRandom, vesselProfile, type BouquetConfig } from "./bouquet";
import { foliageKeys, type FoliageKey, type Vessel } from "./specimens";

export { foliageKeys };
export type { FoliageKey };

export type FoliageArchetype = {
  key: Exclude<FoliageKey, "none">;
  name: string;
  latin: string;
  /** one line, in the same register as the specimen notes */
  note: string;
  /** how many sprays a bouquet of this greenery carries */
  sprays: number;
  /** leaves (or beads) per spray */
  leaves: number;
  /** 0 arching → 1 standing straight up */
  posture: number;
  /** how far the spray leans out from the vessel mouth, radians */
  lean: number;
  /** length of the spray, in bouquet units */
  reach: number;
  /** leaf colour pair, dark to light */
  colour: [string, string];
  /** stem colour */
  stem: string;
  /** leaf silhouette */
  shape: "lance" | "coin" | "blade" | "pinna" | "bead";
  /** how large one leaf is, relative to the spray */
  scale: number;
  /** how far each leaf lifts off the stem, radians */
  lift: number;
  /** true when leaves sit in opposite pairs rather than spiralling */
  paired: boolean;
};

export const FOLIAGE: Record<Exclude<FoliageKey, "none">, FoliageArchetype> = {
  sage: {
    key: "sage",
    name: "Sage",
    latin: "Salvia officinalis",
    note: "Soft, grey and slightly furred — the quietest green in the room.",
    sprays: 5,
    leaves: 11,
    posture: 0.72,
    lean: 0.34,
    reach: 1.5,
    colour: ["#7d8f74", "#c3cdb4"],
    stem: "#6d7d63",
    shape: "lance",
    scale: 0.26,
    lift: 0.5,
    paired: true,
  },
  eucalyptus: {
    key: "eucalyptus",
    name: "Eucalyptus",
    latin: "Eucalyptus cinerea",
    note: "Coins of silver-blue leaf, spaced like a ladder up a pale stem.",
    sprays: 5,
    leaves: 10,
    posture: 0.86,
    lean: 0.24,
    reach: 1.85,
    colour: ["#8fa6a3", "#d4e0da"],
    stem: "#8b9c93",
    shape: "coin",
    scale: 0.24,
    lift: 0.62,
    paired: true,
  },
  ruscus: {
    key: "ruscus",
    name: "Ruscus",
    latin: "Ruscus aculeatus",
    note: "Stiff, dark and pointed. It is the structure holding everything else up.",
    sprays: 4,
    leaves: 7,
    posture: 0.66,
    lean: 0.42,
    reach: 1.35,
    colour: ["#2f4a3a", "#6d8c6b"],
    stem: "#3d5643",
    shape: "blade",
    scale: 0.4,
    lift: 0.34,
    paired: true,
  },
  fern: {
    key: "fern",
    name: "Fern",
    latin: "Nephrolepis exaltata",
    note: "A single frond of many small blades, arching until it is almost horizontal.",
    sprays: 3,
    leaves: 15,
    posture: 0.18,
    lean: 0.82,
    reach: 2.05,
    colour: ["#3f5f45", "#93b184"],
    stem: "#4a6549",
    shape: "pinna",
    scale: 0.17,
    lift: 0.72,
    paired: true,
  },
  gypsophila: {
    key: "gypsophila",
    name: "Baby's Breath",
    latin: "Gypsophila paniculata",
    note: "A cloud of near-nothing. In glass it reads as a fistful of small beads.",
    sprays: 4,
    leaves: 22,
    posture: 0.8,
    lean: 0.6,
    reach: 1.6,
    colour: ["#efe6dd", "#fffaf4"],
    stem: "#a9b09d",
    shape: "bead",
    scale: 0.062,
    lift: 0.9,
    paired: false,
  },
};

export function getFoliage(key: string | null | undefined): FoliageArchetype | null {
  if (!key || key === "none") return null;
  return FOLIAGE[key as Exclude<FoliageKey, "none">] ?? null;
}

/** One leaf on a spray. `t` is its position along the stem, 0 at the mouth → 1 at the tip. */
export type FoliageLeaf = {
  t: number;
  /** which side of the stem it sits on, radians about the stem axis */
  side: number;
  /** how far it lifts away from the stem */
  lift: number;
  /** per-leaf size multiplier */
  scale: number;
  /** roll about its own long axis */
  roll: number;
};

/** One spray: a bowed stem rising out of the vessel, carrying its leaves. */
export type FoliageSpray = {
  id: number;
  key: Exclude<FoliageKey, "none">;
  origin: [number, number, number];
  azimuth: number;
  lean: number;
  length: number;
  bow: number;
  leaves: FoliageLeaf[];
};

/**
 * Where the greenery sits.
 *
 * Foliage is composed *behind* the blooms, so it leans wider and lower than the flowers:
 * the same golden-angle spread as a spiral arrangement, offset half a turn, so a leaf
 * never lands directly in front of a flower head.
 */
export function composeFoliage(config: BouquetConfig): FoliageSpray[] {
  const archetype = getFoliage(config.foliage);
  if (!archetype) return [];

  // salted so foliage draws a different sequence than the stems from the same seed
  const rand = makeRandom((config.seed || 1) ^ 0x5bf03635);
  const vessel: { height: number; mouth: number } = vesselProfile[config.vessel as Vessel];
  const mouthY = vessel.height - 0.06;
  const radialLimit = vessel.mouth * 0.55;

  // density scales the greenery: an eleven-stem bouquet can carry more of it
  const sprays = Math.max(2, Math.round(archetype.sprays * (0.7 + config.density / 22)));
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  const out: FoliageSpray[] = [];
  for (let i = 0; i < sprays; i++) {
    const azimuth = i * GOLDEN + Math.PI + rand() * 0.4;
    const radial = Math.min(radialLimit, 0.03 + rand() * 0.05);
    // a solitaire is a single bloom in a wide bowl; foliage is what makes it a composition
    const spread = config.arrangement === "solitaire" ? 1.35 : 1;
    const lean = archetype.lean * spread * (0.7 + rand() * 0.6);
    const length = archetype.reach * (0.78 + rand() * 0.38) * (config.arrangement === "solitaire" ? 0.82 : 1);

    const leaves: FoliageLeaf[] = [];
    const count = Math.max(2, Math.round(archetype.leaves * (0.75 + rand() * 0.5)));
    for (let l = 0; l < count; l++) {
      const t = 0.22 + (l / count) * 0.78;
      // paired leaves sit opposite each other; single ones spiral up the stem
      const side = archetype.paired ? Math.floor(l / 2) * 1.9 + (l % 2) * Math.PI : l * 2.4 + rand() * 0.5;
      // leaves shrink toward the tip, which is what makes a spray read as a spray
      const taper = 1 - t * 0.55;
      leaves.push({
        t: Math.min(0.99, t + (rand() - 0.5) * 0.02),
        side,
        lift: archetype.lift * (0.75 + rand() * 0.5) * (1 - t * 0.3),
        scale: archetype.scale * taper * (0.85 + rand() * 0.3),
        roll: (rand() - 0.5) * 0.6,
      });
    }

    out.push({
      id: i,
      key: archetype.key,
      origin: [Math.cos(azimuth) * radial, mouthY, Math.sin(azimuth) * radial],
      azimuth,
      lean,
      length,
      bow: (rand() - 0.5) * (1 - archetype.posture * 0.7) * 1.6,
      leaves,
    });
  }

  // back to front, matching the stems' painter ordering
  return out.sort((a, b) => a.origin[2] - b.origin[2]);
}

/** How many leaves a whole bouquet carries — used in the card and share summaries. */
export function foliageCount(sprays: FoliageSpray[]): number {
  return sprays.reduce((n, spray) => n + spray.leaves.length, 0);
}
