// What the film offers, and the facts the page tells.
//
// This is the Flora-Synth adaptation of the Stamen kit. The kit shipped as a
// florist's shop — sizes, prices, delivery plans, a bag and a checkout hand-off.
// Flora-Synth is a botanical instrument, not a store, so the commerce is gone:
// no prices, no plans, no delivery promises, no bag. What survives is the part
// that was always the point — three bouquet scales, four colour stories, a
// wrap and a vessel, the stem library, and the care notes.

import type { Recipe } from "./bouquet";
import type { SpeciesId } from "./flora";

export type SizeId = "petite" | "classic" | "grand";
export type PaletteId = "garnet" | "blush" | "wine" | "wild";
export type WrapId = "kraft" | "blush" | "garnet" | "ink";

/*
 * The ten specimens, spread across every recipe. A composition is a *cast*: the
 * handful of species in the vase, not the whole catalogue. Each scale names its
 * own cast, so switching scale changes which flowers are in the room as well as
 * how many — which is what makes the builder's live bouquet worth watching.
 */
export const SIZES: { id: SizeId; name: string; stems: number; note: string; recipe: Omit<Recipe, "tone"> }[] = [
  {
    id: "petite",
    name: "Petite",
    stems: 12,
    note: "Seven specimens",
    recipe: {
      stems: { peony: 1, rose: 2, anemone: 2, orchid: 1, ranunculus: 2, tulip: 1, cosmos: 1, dahlia: 1, anthurium: 1 },
      eucalyptus: 3,
      radius: 0.25,
    },
  },
  {
    id: "classic",
    name: "Classic",
    stems: 19,
    note: "The full ten",
    recipe: {
      stems: {
        peony: 2,
        rose: 2,
        ranunculus: 2,
        tulip: 2,
        anemone: 2,
        cosmos: 2,
        orchid: 2,
        protea: 1,
        dahlia: 2,
        anthurium: 2,
      },
      eucalyptus: 4,
      radius: 0.3,
    },
  },
  {
    id: "grand",
    name: "Grand",
    stems: 30,
    note: "Weighted to the exotics",
    recipe: {
      stems: {
        peony: 3,
        rose: 3,
        ranunculus: 3,
        tulip: 2,
        anemone: 3,
        cosmos: 2,
        orchid: 3,
        protea: 3,
        dahlia: 4,
        anthurium: 4,
      },
      eucalyptus: 6,
      radius: 0.36,
    },
  },
];

type Look = [[string, string, string], [string, string, string]];

export const PALETTES: {
  id: PaletteId;
  name: string;
  note: string;
  swatch: string[];
  tone: number;
  looks?: Partial<Record<SpeciesId, Look>>;
}[] = [
  {
    id: "garnet",
    name: "Garnet",
    note: "The house colour: deep red, gold light",
    swatch: ["#9e2b3e", "#c2606f", "#3a0f16"],
    tone: 0.15,
    looks: {
      // the two white flowers stay white; only the coloured ones follow the story
      orchid: [["#eef7ef", "#d7ece2", "#bfe0d1"], ["#f9fffc", "#e3f4ec", "#cfe8dc"]],
      protea: [["#e8a3ad", "#c2606f", "#9e2b3e"], ["#f2c4c9", "#d98b97", "#b34a5c"]],
      anthurium: [["#3a0f16", "#7a1f2d", "#9e2b3e"], ["#45121a", "#8a2433", "#b33446"]],
    },
  },
  { id: "blush", name: "Blush", note: "Pale pinks and cream", swatch: ["#f4b6cb", "#fde2e2", "#e9a2ab"], tone: 1 },
  {
    id: "wine",
    name: "Wine",
    note: "Deep, dark, after eight",
    swatch: ["#5b0b2a", "#8e1640", "#2a0618"],
    tone: 0,
    looks: {
      peony: [["#2a0412", "#6e0b2c", "#a3204a"], ["#3b0718", "#80112f", "#b12a50"]],
      rose: [["#2c0512", "#6a0d2b", "#a5294e"], ["#3a0816", "#7c1534", "#b8405f"]],
      ranunculus: [["#2a0412", "#7a0c33", "#b81d4f"], ["#30051a", "#5e0b3f", "#8e1d63"]],
      tulip: [["#1c0418", "#4a0b3a", "#7a1a5c"], ["#24051a", "#5a0c2c", "#8c1c45"]],
      anemone: [["#120310", "#5a0a34", "#8e1652"], ["#120310", "#4e0a40", "#7d1a63"]],
      cosmos: [["#3a0620", "#7a0c3e", "#a8205a"], ["#3a0620", "#7a0c3e", "#a8205a"]],
      dahlia: [["#2a0618", "#6a0d2b", "#a5294e"], ["#30051a", "#7a0c33", "#b81d4f"]],
      protea: [["#2a0618", "#7a0c2b", "#a81c3c"], ["#30051a", "#8a1333", "#b82a48"]],
      anthurium: [["#1c0410", "#4a0a1c", "#7a1124"], ["#240514", "#5a0c22", "#8c162c"]],
      orchid: [["#2a0a20", "#5a1838", "#8e2a52"], ["#300c26", "#6a1d42", "#a33360"]],
    },
  },
  {
    id: "wild",
    name: "Wild",
    note: "A bit of everything",
    swatch: ["#d0175f", "#ffb19f", "#efe2ea"],
    tone: 0.5,
    looks: {
      anthurium: [["#4a0a16", "#8e1224", "#c22a38"], ["#5c0d1a", "#a01a2b", "#d93a48"]],
    },
  },
];

export const WRAPS: { id: WrapId; name: string; paper: string; ribbon: string }[] = [
  { id: "kraft", name: "Kraft", paper: "#c9a27c", ribbon: "#f4ead8" },
  { id: "blush", name: "Blush tissue", paper: "#f6cfda", ribbon: "#9e2b3e" },
  { id: "garnet", name: "Garnet", paper: "#8a2130", ribbon: "#fff3f6" },
  { id: "ink", name: "Ink", paper: "#1f1a1e", ribbon: "#c2606f" },
];

export const sizeById = (id: SizeId) => SIZES.find((s) => s.id === id)!;
export const paletteById = (id: PaletteId) => PALETTES.find((p) => p.id === id)!;
export const wrapById = (id: WrapId) => WRAPS.find((w) => w.id === id)!;

/**
 * The stem library: every flower the engine can build with, as a botanical
 * plate. Season is real flowering time, `hold` is how long the cut flower
 * lasts, and `stage` is where it is in its own opening — not a delivery promise,
 * because nothing here is delivered.
 */
export const STEMS: { id: SpeciesId; season: string; hold: string; stage: string; note: string }[] = [
  { id: "peony", season: "May to July", hold: "5 to 7 days", stage: "A soft marshmallow bud", note: "A fist of tissue that opens to the size of your hand. Overnight, sometimes; you'll hear it." },
  { id: "rose", season: "All year", hold: "7 to 10 days", stage: "Outer petals just loosening", note: "Garden roses, not the long-stem kind: cupped, quartered, and they actually smell of rose." },
  { id: "ranunculus", season: "January to May", hold: "8 to 12 days", stage: "At colour break", note: "Paper-thin petals in a perfect spiral. The longest-lasting thing in the vase." },
  { id: "tulip", season: "December to April", hold: "5 to 8 days", stage: "Closed, still growing", note: "Tulips keep growing in the vase and bend to find the light. Let them." },
  { id: "anemone", season: "October to May", hold: "6 to 9 days", stage: "As the bud turns", note: "Opens every morning and closes every night. That black centre is all stamen." },
  { id: "cosmos", season: "July to October", hold: "4 to 6 days", stage: "Open, light as a moth", note: "A garden flower, gone in a week, worth it. The petals are barely one cell thick." },
  { id: "orchid", season: "Late summer", hold: "10 to 14 days", stage: "The spray opening", note: "A leafless orchid that photosynthesises through its roots and appears to float, unattached, in humid air. Its spur can run 15 cm behind the flower." },
  { id: "protea", season: "All year", hold: "2 to 3 weeks", stage: "Open, and barely moves", note: "A collar of bracts around a furred heart the size of a fist. The longest-lived flower here by a week." },
  { id: "dahlia", season: "July to October", hold: "5 to 8 days", stage: "Tight, opening inward out", note: "Quilled petals packed so tightly the flower reads as a sphere. Café au Lait is the soft one: milk, dust and a bruise of rose." },
  { id: "anthurium", season: "Year round", hold: "3 to 4 weeks", stage: "In flat bloom", note: "Not a petal but a spathe, a leaf pretending. The velvet is real: the surface is built to stop water beading on it." },
];

/** the name of the opening stage the film's HUD shows */
export function stageOf(bloom: number) {
  if (bloom < 0.1) return "Tight bud";
  if (bloom < 0.28) return "Colour break";
  if (bloom < 0.48) return "Cup";
  if (bloom < 0.72) return "Opening";
  if (bloom < 0.94) return "Full bloom";
  return "Blown";
}

export const CARE = [
  { q: "Why does the film start with a closed bud?", a: "Because that is the interesting part. A cut flower opens over two or three days, and the whole show is in that opening: the green splitting, the petals reaching, the centre arriving last. The scroll is that clock, running at any speed you like." },
  { q: "How do you keep a real one alive?", a: "Cut a centimetre off every stem at an angle with a sharp knife, into a clean vase of cool water. Strip any leaves that would sit below the water. Change the water every other day and re-cut when you do." },
  { q: "How long will they last?", a: "Most of a bouquet looks its best for about a week; ranunculus and roses often go ten days, and a protea or an anthurium will outlast everything else in the vase. Change the water every other day and re-cut the stems when you do." },
  { q: "Where should I put them?", a: "Somewhere you'll see them, out of direct sun and away from the fruit bowl. Ripening fruit gives off ethylene, which tells flowers to finish early." },
  { q: "How does this get made?", a: "Every flower you see is drawn in your browser from a recipe — petal count, curl, colour — not loaded as a model. Turn the seed and the same species ruffles differently. Nothing is a photograph." },
  { q: "Can I keep a composition?", a: "Yes. Build one in the panel and seal it: the link carries the whole recipe, so it reopens exactly the same on any device, and nobody has to store anything." },
  { q: "The petals fell. Is that bad?", a: "That's the end of a good bouquet, not a fault. Peonies and anemones drop their petals all at once when they're done. Press a few in a book." },
];
