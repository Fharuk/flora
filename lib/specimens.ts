/**
 * Ten specimens, curated for silhouette, rarity and how well they read as crystal.
 * Every species is described as a recipe — the geometry is generated from these numbers,
 * so there are no model files to download and every flower is resolution-independent.
 */

export type Form = "spiral" | "cup" | "spray" | "spike" | "spathe" | "fan";
export type Finish = "glass" | "chrome" | "porcelain" | "iridescent";

export type Rarity = "common" | "rare" | "exotic" | "legendary" | "mythic";

/** Collectibility tier, shown alongside the botanical record rather than instead of it. */
export const RARITY_ORDER: Rarity[] = ["common", "rare", "exotic", "legendary", "mythic"];

export const rarityBySlug: Record<string, Rarity> = {
  "ghost-orchid": "legendary",
  "king-protea": "exotic",
  "cafe-au-lait-dahlia": "exotic",
  "velvet-anthurium": "rare",
  "peony": "rare",
  "garden-rose": "common",
  "ranunculus": "common",
  "tulip": "common",
  "anemone": "common",
  "cosmos": "common",
};

export const rarityLabel: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  exotic: "Exotic",
  legendary: "Legendary",
  mythic: "Mythic",
};

/**
 * Two-letter species codes live here rather than in the URL codec, so the hybrid engine can
 * build a resolvable slug without importing the codec module back.
 */
export const SPECIES_CODE: Record<string, string> = {
  "ghost-orchid": "gh",
  "king-protea": "kp",
  "peony": "pe",
  "garden-rose": "ro",
  "ranunculus": "ra",
  "tulip": "tu",
  "anemone": "an",
  "cosmos": "co",
  "cafe-au-lait-dahlia": "da",
  "velvet-anthurium": "va",
};

export const CODE_SPECIES: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIES_CODE).map(([slug, code]) => [code, slug])
);

export type Specimen = {
  slug: string;
  name: string;
  latin: string;
  family: string;
  origin: string;
  blurb: string;
  /** one-line poetic note shown under the name */
  note: string;
  form: Form;
  finish: Finish;
  /** petal geometry recipe */
  petals: {
    count: number;
    layers: number;
    length: number;
    width: number;
    /** 0 = flat, 1 = strongly cupped */
    cup: number;
    /** negative = recurved backward (lily), positive = folded forward */
    curl: number;
    /** rotation of each petal about its own axis */
    twist: number;
    /** vertical stacking per layer */
    rise: number;
    /** spread of the ring in radians */
    spread: number;
  };
  spike?: { count: number; height: number; radius: number };
  colours: {
    petal: [string, string];
    core: string;
    stem: string;
  };
  bloom: string;
  /** relative visual weight in a bouquet */
  weight: number;
};

export const specimens: Specimen[] = [
  {
    slug: "ghost-orchid",
    name: "Ghost Orchid",
    latin: "Dendrophylax lindenii",
    family: "Orchidaceae",
    origin: "Cuba · Florida",
    blurb:
      "A leafless orchid that photosynthesises through its roots and appears to float, unattached, in humid air. Its spur can run 15 cm behind the flower.",
    note: "Grown for absence as much as form.",
    form: "spray",
    finish: "iridescent",
    petals: { count: 6, layers: 2, length: 0.95, width: 0.42, cup: 0.25, curl: -0.18, twist: 0.35, rise: 0.12, spread: Math.PI * 2 },
    spike: { count: 4, height: 1.5, radius: 0.16 },
    colours: { petal: ["#eef7ef", "#b6d8c6"], core: "#c9f27a", stem: "#7f9d8b" },
    bloom: "Late summer",
    weight: 1,
  },
  {
    slug: "king-protea",
    name: "King Protea",
    latin: "Protea cynaroides",
    family: "Proteaceae",
    origin: "South Africa",
    blurb:
      "The largest protea head in the world: a ring of bracts around a dense central cushion, engineered to survive fire and to be pollinated by sugarbirds.",
    note: "A crown that opens outward.",
    form: "cup",
    finish: "porcelain",
    petals: { count: 34, layers: 3, length: 1.25, width: 0.46, cup: 0.6, curl: -0.3, twist: 0.14, rise: 0.14, spread: Math.PI * 1.7 },
    colours: { petal: ["#f7dce1", "#dd93a6"], core: "#f3eee4", stem: "#5c6b4f" },
    bloom: "Winter",
    weight: 3,
  },
  {
    slug: "peony",
    name: "Peony",
    latin: "Paeonia lactiflora",
    family: "Paeoniaceae",
    origin: "China · Siberia",
    blurb:
      "A fist of tissue that opens to the size of your hand, sometimes overnight. The oldest written peony is a Chinese medicinal text; the flowers came later, and took over.",
    note: "You can hear it open.",
    form: "spiral",
    finish: "porcelain",
    petals: { count: 38, layers: 6, length: 1.0, width: 0.78, cup: 0.66, curl: 0.22, twist: 0.2, rise: 0.075, spread: Math.PI * 2 },
    colours: { petal: ["#c9767f", "#8e2537"], core: "#e8cf9f", stem: "#3f5a3a" },
    bloom: "May to July",
    weight: 3.4,
  },
  {
    slug: "garden-rose",
    name: "Garden rose",
    latin: "Rosa × hybrida",
    family: "Rosaceae",
    origin: "Garden hybrid",
    blurb:
      "Not the long-stemmed florist kind: cupped, quartered, and it actually smells of rose. The scent is a molecule the cut-flower trade spent a century breeding out of the vase varieties.",
    note: "Cupped, quartered, and scented.",
    form: "cup",
    finish: "porcelain",
    petals: { count: 32, layers: 7, length: 0.92, width: 0.7, cup: 0.72, curl: 0.16, twist: 0.12, rise: 0.06, spread: Math.PI * 2 },
    colours: { petal: ["#d69aa0", "#9e2b3e"], core: "#e6d3a8", stem: "#3d5539" },
    bloom: "All year",
    weight: 2.6,
  },
  {
    slug: "tulip",
    name: "Tulip",
    latin: "Tulipa gesneriana",
    family: "Liliaceae",
    origin: "Central Asia · Turkey",
    blurb:
      "Cut it and it keeps growing in the vase, bending to find the light. In the 1630s a single bulb of a broken-striped variety cost more than a house in Amsterdam.",
    note: "Still growing after it is cut.",
    form: "cup",
    finish: "glass",
    petals: { count: 6, layers: 2, length: 1.15, width: 0.6, cup: 0.82, curl: 0.06, twist: 0.04, rise: 0.05, spread: Math.PI * 2 },
    colours: { petal: ["#9e4a57", "#5e2130"], core: "#2a1215", stem: "#4a6b45" },
    bloom: "December to April",
    weight: 1.8,
  },
  {
    slug: "anemone",
    name: "Anemone",
    latin: "Anemone coronaria",
    family: "Ranunculaceae",
    origin: "Mediterranean",
    blurb:
      "Opens every morning and closes every night. The black centre is all stamen — a ring of anthers round a dark pistil, which is why it reads as a bullseye from a distance.",
    note: "Named for the part that makes the next one.",
    form: "cup",
    finish: "porcelain",
    petals: { count: 7, layers: 2, length: 1.05, width: 0.98, cup: 0.5, curl: 0.1, twist: 0.08, rise: 0.03, spread: Math.PI * 2 },
    colours: { petal: ["#c2606f", "#8e2537"], core: "#2a1215", stem: "#3f6a2c" },
    bloom: "October to May",
    weight: 1.6,
  },
  {
    slug: "cafe-au-lait-dahlia",
    name: "Café au Lait Dahlia",
    latin: "Dahlia 'Café au Lait'",
    family: "Asteraceae",
    origin: "Mexico (cultivar)",
    blurb:
      "A decorative dahlia whose petals blush from cream to warm salmon depending on the light it received that week — no two heads in a bed are the same colour.",
    note: "The tone that anchors warm bouquets.",
    form: "spiral",
    finish: "porcelain",
    petals: { count: 30, layers: 9, length: 0.82, width: 0.6, cup: 0.5, curl: 0.2, twist: 0.18, rise: 0.06, spread: Math.PI * 2 },
    colours: { petal: ["#f8e2c8", "#d19a6d"], core: "#d9a06f", stem: "#4f6340" },
    bloom: "Late summer",
    weight: 3.5,
  },
  {
    slug: "cosmos",
    name: "Cosmos",
    latin: "Cosmos bipinnatus",
    family: "Asteraceae",
    origin: "Mexico",
    blurb:
      "A garden flower gone in a week, worth it. Each petal is barely one cell thick, which is why light comes through it rather than off it.",
    note: "Light as a moth.",
    form: "fan",
    finish: "glass",
    petals: { count: 8, layers: 1, length: 0.95, width: 0.62, cup: 0.06, curl: 0.04, twist: 0.1, rise: 0.02, spread: Math.PI * 2 },
    colours: { petal: ["#e8c2b4", "#a2404f"], core: "#e2b93b", stem: "#4b6a3e" },
    bloom: "July to October",
    weight: 1.1,
  },
  {
    slug: "ranunculus",
    name: "Ranunculus",
    latin: "Ranunculus asiaticus",
    family: "Ranunculaceae",
    origin: "Persia · Mediterranean",
    blurb:
      "Paper-thin petals in a perfect spiral, packed so tightly the whorl holds water. The Persian name for it is the same word as the flower in a hundred poems.",
    note: "Every petal is a page.",
    form: "spiral",
    finish: "glass",
    petals: { count: 26, layers: 9, length: 0.62, width: 0.46, cup: 0.58, curl: 0.26, twist: 0.24, rise: 0.055, spread: Math.PI * 2 },
    colours: { petal: ["#dd93a0", "#a23044"], core: "#d8c08a", stem: "#46603f" },
    bloom: "January to May",
    weight: 2.2,
  },
  {
    slug: "velvet-anthurium",
    name: "Velvet Anthurium",
    latin: "Anthurium crystallinum",
    family: "Araceae",
    origin: "Colombia · Peru",
    blurb:
      "A heart-shaped spathe that is genuinely velvety to the touch, with veins that can run from silver to near-black. The 'flower' is a leaf doing another job entirely.",
    note: "A leaf pretending to be a petal.",
    form: "spathe",
    finish: "iridescent",
    petals: { count: 1, layers: 1, length: 1.5, width: 1.25, cup: 0.5, curl: 0.18, twist: 0.06, rise: 0, spread: 0 },
    spike: { count: 1, height: 1.0, radius: 0.09 },
    colours: { petal: ["#7d1220", "#b32234"], core: "#f2e6d6", stem: "#35513c" },
    bloom: "Year round",
    weight: 2.5,
  },
];

export const specimenBySlug = new Map(specimens.map((s) => [s.slug, s]));
export const specimenSlugs = specimens.map((s) => s.slug);

/** Botanical record for a base species; hybrids are resolved by `@/lib/hybrids`. */
export function specimenRarity(slug: string): Rarity {
  return rarityBySlug[slug] ?? "common";
}

export type PaletteKey = "frost" | "chrome" | "amber" | "noir";

export type Palette = {
  key: PaletteKey;
  name: string;
  description: string;
  /** tint applied to glass transmission */
  glass: string;
  /** chrome / metal tint */
  metal: string;
  /** point light / caustic colour */
  light: string;
  /** background gradient for the light theme */
  swatch: [string, string];
};

export const palettes: Record<PaletteKey, Palette> = {
  frost: {
    key: "frost",
    name: "Champagne",
    description: "Warm clear glass, the colour of dry champagne",
    glass: "#ffe6cc",
    metal: "#f4dcc2",
    light: "#fff0dc",
    swatch: ["#f6e3cf", "#fffaf1"],
  },
  chrome: {
    key: "chrome",
    name: "Rose Gold",
    description: "Polished copper, mirror highlights",
    glass: "#f3c6a8",
    metal: "#e9b492",
    light: "#ffd9bd",
    swatch: ["#e8b797", "#f9ddc9"],
  },
  amber: {
    key: "amber",
    name: "Amber",
    description: "Warm resin, honey transmission",
    glass: "#ffbe6f",
    metal: "#e0a95f",
    light: "#ffca85",
    swatch: ["#e7c08a", "#fbeed6"],
  },
  noir: {
    key: "noir",
    name: "Claret",
    description: "Smoked wine crystal, ink and candlelight",
    glass: "#a05a63",
    metal: "#c2959a",
    light: "#f0c8c2",
    swatch: ["#3a1d24", "#6b3540"],
  },
};

export const paletteKeys = Object.keys(palettes) as PaletteKey[];

export type Arrangement = "spiral" | "wild" | "arch" | "solitaire";

export const arrangements: { key: Arrangement; name: string; description: string }[] = [
  { key: "spiral", name: "Spiral", description: "Formal hand-tied, stems radiating from one point" },
  { key: "wild", name: "Wild", description: "Loose, asymmetric, taller on one side" },
  { key: "arch", name: "Arch", description: "Sweeping crescent that frames the vessel" },
  { key: "solitaire", name: "Solitaire", description: "A single stem, no company" },
];

export type Vessel = "bulb" | "flute" | "tide";

export const vessels: { key: Vessel; name: string; description: string }[] = [
  { key: "bulb", name: "Bulb", description: "Round-bellied, wide mouth" },
  { key: "flute", name: "Flute", description: "Tall neck, narrow opening" },
  { key: "tide", name: "Tide", description: "Low, wide, ceremonial bowl" },
];
