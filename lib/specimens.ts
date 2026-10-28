/**
 * Ten specimens, curated for silhouette, rarity and how well they read as crystal.
 * Every species is described as a recipe — the geometry is generated from these numbers,
 * so there are no model files to download and every flower is resolution-independent.
 */

export type Form = "spiral" | "cup" | "spray" | "spike" | "spathe" | "fan";
export type Finish = "glass" | "chrome" | "porcelain" | "iridescent";

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
    slug: "gloriosa-lily",
    name: "Gloriosa Lily",
    latin: "Gloriosa superba",
    family: "Colchicaceae",
    origin: "Tropical Asia · Africa",
    blurb:
      "Petals that reverse completely as they open, so the flower hangs like a chandelier of flame. One of the few climbing lilies.",
    note: "Flame, inverted.",
    form: "spike",
    finish: "glass",
    petals: { count: 6, layers: 1, length: 1.35, width: 0.26, cup: 0.1, curl: -1.25, twist: 0.9, rise: 0.05, spread: Math.PI * 2 },
    spike: { count: 3, height: 1.9, radius: 0.3 },
    colours: { petal: ["#ff6a3d", "#d92b3a"], core: "#f6cf6b", stem: "#2f5a3b" },
    bloom: "Midsummer",
    weight: 2,
  },
  {
    slug: "bird-of-paradise",
    name: "Bird of Paradise",
    latin: "Strelitzia reginae",
    family: "Strelitziaceae",
    origin: "South Africa",
    blurb:
      "A horizontal spathe holding orange sepals and a blue arrow of petals — evolved so that a bird landing on it is dusted with pollen at exactly the right angle.",
    note: "Built for one visitor only.",
    form: "fan",
    finish: "chrome",
    petals: { count: 7, layers: 1, length: 1.55, width: 0.2, cup: 0.05, curl: 0.35, twist: 0.18, rise: 0.1, spread: Math.PI * 0.42 },
    colours: { petal: ["#ff7a2f", "#ffb347"], core: "#2f4bd8", stem: "#41603f" },
    bloom: "Year round",
    weight: 2.5,
  },
  {
    slug: "black-hellebore",
    name: "Black Hellebore",
    latin: "Helleborus niger",
    family: "Ranunculaceae",
    origin: "Balkans · Alps",
    blurb:
      "The Christmas rose: five waxy sepals that hold their colour for months, opening in snow. Nothing about it is actually black — it is a plum so deep it reads as absence.",
    note: "The darkest note in the arrangement.",
    form: "cup",
    finish: "porcelain",
    petals: { count: 5, layers: 2, length: 1.0, width: 0.72, cup: 0.5, curl: 0.12, twist: -0.2, rise: 0.06, spread: Math.PI * 2 },
    colours: { petal: ["#231427", "#3b1f33"], core: "#e8e3c4", stem: "#3d4a3b" },
    bloom: "Midwinter",
    weight: 1.5,
  },
  {
    slug: "cymbidium-orchid",
    name: "Cymbidium Orchid",
    latin: "Cymbidium goeringii",
    family: "Orchidaceae",
    origin: "Himalaya · East Asia",
    blurb:
      "Cultivated for two thousand years. Each stem carries eight to twelve flowers that open in sequence, so a single spike blooms for a season.",
    note: "Patience, held on one stem.",
    form: "spray",
    finish: "glass",
    petals: { count: 6, layers: 2, length: 1.0, width: 0.82, cup: 0.3, curl: -0.24, twist: 0.3, rise: 0.08, spread: Math.PI * 2 },
    spike: { count: 3, height: 1.7, radius: 0.2 },
    colours: { petal: ["#f8f1e0", "#d8c49c"], core: "#c11f5a", stem: "#4a6b45" },
    bloom: "Winter",
    weight: 1.8,
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
    slug: "titan-arum",
    name: "Corpse Flower",
    latin: "Amorphophallus titanum",
    family: "Araceae",
    origin: "Sumatra",
    blurb:
      "The largest unbranched inflorescence on earth — a single furled spathe around a spadix that heats itself to 37°C to carry its scent through the rainforest at night.",
    note: "Architecture, not decoration.",
    form: "spathe",
    finish: "iridescent",
    petals: { count: 1, layers: 1, length: 2.5, width: 1.5, cup: 0.95, curl: -0.55, twist: 0.1, rise: 0, spread: 0 },
    spike: { count: 1, height: 1.5, radius: 0.16 },
    colours: { petal: ["#5a1226", "#7d1f2f"], core: "#e8d9a8", stem: "#3a5440" },
    bloom: "Once a decade",
    weight: 4,
  },
  {
    slug: "persian-ranunculus",
    name: "Persian Ranunculus",
    latin: "Ranunculus asiaticus",
    family: "Ranunculaceae",
    origin: "Persia · Mediterranean",
    blurb:
      "Hundreds of papery petals packed into a whorl so tight it holds water. The cultivar 'Cloni' takes a decade to stabilise from a single mutation.",
    note: "Every petal is a page.",
    form: "spiral",
    finish: "glass",
    petals: { count: 24, layers: 9, length: 0.6, width: 0.44, cup: 0.58, curl: 0.26, twist: 0.24, rise: 0.055, spread: Math.PI * 2 },
    colours: { petal: ["#fdf5ea", "#e9b9a6"], core: "#c8a06a", stem: "#4d6b45" },
    bloom: "Spring",
    weight: 2,
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
    name: "Frost",
    description: "Cool clear glass, near-white, no pigment",
    glass: "#eaf4fb",
    metal: "#dfe9ef",
    light: "#eaf6ff",
    swatch: ["#dfeaf0", "#f7fbfd"],
  },
  chrome: {
    key: "chrome",
    name: "Chrome",
    description: "Liquid metal, mirror highlights",
    glass: "#cfd8dc",
    metal: "#f2f5f7",
    light: "#ffffff",
    swatch: ["#c3ccd2", "#eef3f6"],
  },
  amber: {
    key: "amber",
    name: "Amber",
    description: "Warm resin, honey transmission",
    glass: "#ffc87a",
    metal: "#e6b877",
    light: "#ffcf8a",
    swatch: ["#e8c99b", "#fbefdc"],
  },
  noir: {
    key: "noir",
    name: "Noir",
    description: "Smoked crystal, ink and silver",
    glass: "#6f7d86",
    metal: "#9aa4ab",
    light: "#b9c6cf",
    swatch: ["#2a3034", "#4a5257"],
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
