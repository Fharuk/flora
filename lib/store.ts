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

export const useSynth = create<SynthState>((set, get) => ({
  config: DEFAULT_CONFIG,
  theme: "light",
  generation: 0,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const theme = resolveInitialTheme(
      window.location.search,
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    const config = params.toString() ? decodeBouquet(params) : DEFAULT_CONFIG;
    set({ config, theme, hydrated: true });
  },

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),

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
    // Trailing slash stripped: pathname is "/" at the root, so keeping it produced
    // "https://host/" + "/?seed=…" — a share link with a double slash that still worked
    // but looked broken wherever it was displayed or pasted.
    setOrigin(window.location.origin + window.location.pathname.replace(/\/+$/, ""));
  }, []);
  const path = `/?${encodeBouquet(config)}&theme=${theme}`;
  return origin ? `${origin}${path}` : path;
}

export function useBouquetMeta() {
  const config = useSynth((s) => s.config);
  return { title: bouquetTitle(config), query: encodeBouquet(config) };
}
