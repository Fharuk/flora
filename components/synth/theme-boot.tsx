"use client";

import { useEffect } from "react";

import { encodeBouquet } from "@/lib/bouquet";
import { useSynth } from "@/lib/store";

/** Keeps the attribute in sync when the theme changes after load. */
export function ThemeBoot() {
  const theme = useSynth((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  return null;
}

/**
 * Runs once: hydrate state from the URL, then mirror changes back into it.
 *
 * Two things were wrong here before. The write was deferred behind requestAnimationFrame
 * *and* a dynamic import of the encoder, so the address bar could lag a second or more
 * behind the bouquet — and never updated at all while the tab was in the background,
 * because rAF is suspended there. It also only ran on *changes*, so arriving on a bare
 * `?theme=dark` link left the URL without any bouquet parameters.
 *
 * Now the encoder is a static import, the write is synchronous, and it runs once on
 * hydrate so the URL always reflects what is on screen. The hash is preserved; replacing
 * the URL with path + query alone silently dropped a `#specimens` anchor the moment a
 * visitor touched a control.
 */
export function UrlSync() {
  const hydrate = useSynth((s) => s.hydrate);
  const hydrated = useSynth((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;

    let last = "";

    const write = (config: Parameters<typeof encodeBouquet>[0], theme: string) => {
      const query = encodeBouquet(config);
      const url = `${window.location.pathname}?${query}&theme=${theme}${window.location.hash}`;
      if (url === last) return;
      last = url;
      window.history.replaceState(null, "", url);
    };

    const { config, theme } = useSynth.getState();
    write(config, theme);

    return useSynth.subscribe((state) => write(state.config, state.theme));
  }, [hydrated]);

  return null;
}
