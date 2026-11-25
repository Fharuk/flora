"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

import {
  DEFAULT_CONFIG,
  bouquetTitle,
  decodeBouquet,
  encodeBouquet,
  randomSeed,
  type BouquetConfig,
} from "@/lib/bouquet";
import type { Arrangement, PaletteKey, Vessel } from "@/lib/specimens";
import { resolveInitialTheme, type ThemeName } from "@/lib/theme";

export type Theme = ThemeName;

type SynthState = {
  config: BouquetConfig;
  theme: Theme;
  /** increments on every generation so the scene can key its entrance animation */
  generation: number;
  hydrated: boolean;

  hydrate: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  generate: () => void;
  applyConfig: (config: BouquetConfig) => void;
  setSeed: (seed: number) => void;
  setPalette: (p: PaletteKey) => void;
  setArrangement: (a: Arrangement) => void;
  setVessel: (v: Vessel) => void;
  setDensity: (d: number) => void;
  setBloom: (b: number) => void;

  toggleSpecies: (slug: string) => void;
  setSpecies: (slugs: string[]) => void;
  addSpecies: (slug: string) => void;
  clearSpecies: () => void;
};

const MAX_SPECIES = 5;

/**
 * Routes that own the bouquet URL.
 *
 * `/gift/[code]` deliberately does not: the gift page sets its own composition from the
 * database, and a URL sync running there would append the homepage's bouquet to a gift link
 * and then overwrite the gift with it on hydration.
 */
/**
 * Routes whose URL *is* the bouquet. `/compose` joined the list when the
 * instrument moved off `/`; the film owns `/` now and keeps its own recipe
 * params, so it must not mirror the instrument's state into its address bar.
 */
export function ownsBouquetUrl(pathname: string): boolean {
  return pathname === "/compose" || pathname === "/studio";
}

export const useSynth = create<SynthState>((set, get) => ({
  config: DEFAULT_CONFIG,
  theme: "light",
  generation: 0,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    // the theme is a page-level preference and is read on every route …
    const theme = resolveInitialTheme(
      window.location.search,
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    // … but the bouquet only belongs to the routes that compose one
    const config =
      ownsBouquetUrl(window.location.pathname) && params.toString()
        ? decodeBouquet(params)
        : DEFAULT_CONFIG;
    set({ config, theme, hydrated: true });
  },

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),

  applyConfig: (config) => set((s) => ({ config, generation: s.generation + 1 })),

  generate: () =>
    set((s) => ({
      config: { ...s.config, seed: randomSeed() },
      generation: s.generation + 1,
    })),

  setSeed: (seed) => set((s) => ({ config: { ...s.config, seed }, generation: s.generation + 1 })),
  setPalette: (palette) => set((s) => ({ config: { ...s.config, palette } })),
  setArrangement: (arrangement) => set((s) => ({ config: { ...s.config, arrangement } })),
  setVessel: (vessel) => set((s) => ({ config: { ...s.config, vessel } })),
  setDensity: (density) => set((s) => ({ config: { ...s.config, density } })),
  setBloom: (bloom) => set((s) => ({ config: { ...s.config, bloom } })),

  toggleSpecies: (slug) =>
    set((s) => {
      const has = s.config.species.includes(slug);
      if (has && s.config.species.length === 1) return s;
      const species = has
        ? s.config.species.filter((x) => x !== slug)
        : [...s.config.species, slug].slice(-MAX_SPECIES);
      return { config: { ...s.config, species }, generation: s.generation + 1 };
    }),

  setSpecies: (species) =>
    set((s) => ({
      config: { ...s.config, species: species.slice(0, MAX_SPECIES) },
      generation: s.generation + 1,
    })),

  addSpecies: (slug) =>
    set((s) => {
      if (s.config.species.includes(slug)) return { config: { ...s.config, seed: randomSeed() }, generation: s.generation + 1 };
      const species = [...s.config.species, slug].slice(-MAX_SPECIES);
      return { config: { ...s.config, species, seed: randomSeed() }, generation: s.generation + 1 };
    }),

  clearSpecies: () =>
    set((s) => ({
      config: { ...s.config, species: [s.config.species[s.config.species.length - 1] ?? DEFAULT_CONFIG.species[0]] },
      generation: s.generation + 1,
    })),
}));

/**
 * The shareable link for the current bouquet.
 * Returns "" until mounted so server and client markup agree on first paint.
 */
export function useShareUrl() {
  const config = useSynth((s) => s.config);
  const theme = useSynth((s) => s.theme);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    /*
     * Only the host, never the path. This used to append
     * `location.pathname`, which was harmless while the instrument lived at "/"
     * and became a doubled route the moment it moved: on /compose the link read
     * `/compose/compose/?seed=…`, and on /studio it read `/studio/compose/?…`,
     * neither of them a page. The route is named once, below.
     */
    setOrigin(window.location.origin);
  }, []);
  /*
   * `/` is the film now — it reads `?size=&c=&w=&v=`, not this recipe, so a
   * copied link pointing there opened the default bouquet and quietly dropped
   * the composition. Share links have to name the instrument's route.
   */
  const path = `/compose/?${encodeBouquet(config)}&theme=${theme}`;
  return origin ? `${origin}${path}` : path;
}

export function useBouquetMeta() {
  const config = useSynth((s) => s.config);
  return { title: bouquetTitle(config), query: encodeBouquet(config) };
}
