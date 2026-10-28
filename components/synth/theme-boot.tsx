"use client";

import { useEffect } from "react";

import { useSynth } from "@/lib/store";

/**
 * Applies the theme as a data attribute on <html> so CSS variables cascade everywhere —
 * including portals, the canvas wrapper and native form controls. Also keeps the URL in
 * sync with the bouquet so every arrangement is shareable without a backend.
 */
export function ThemeBoot() {
  const theme = useSynth((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}

/** Runs once: hydrate state from the URL, then mirror changes back into it. */
export function UrlSync() {
  const hydrate = useSynth((s) => s.hydrate);
  const hydrated = useSynth((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    let raf = 0;
    const unsub = useSynth.subscribe((state) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        import("@/lib/bouquet").then(({ encodeBouquet }) => {
          const query = encodeBouquet(state.config);
          const url = `${window.location.pathname}?${query}&theme=${state.theme}`;
          window.history.replaceState(null, "", url);
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [hydrated]);

  return null;
}
