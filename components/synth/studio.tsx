"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

import { BouquetCanvas } from "@/components/three/bouquet-scene";
import { BouquetTitle, CopyShare, SeedReadout } from "@/components/synth/studio-parts";
import { AudioToggle } from "@/components/synth/audio-toggle";
import { SavePanel } from "@/components/synth/garden";
import { InstrumentControls } from "@/components/synth/instrument";
import { downloadSTL } from "@/lib/print";
import { useSynth } from "@/lib/store";

/**
 * The studio: the composer on its own route.
 *
 * The homepage teases the instrument; this is where you actually work. The canvas stays
 * pinned while the controls scroll beside it, so the bouquet never leaves the screen —
 * every change is visible at the moment it happens.
 */
export function Studio() {
  const config = useSynth((s) => s.config);
  const theme = useSynth((s) => s.theme);
  const [printing, setPrinting] = useState(false);

  const exportModel = () => {
    setPrinting(true);
    // build off the click frame so the button paints its pressed state first
    window.setTimeout(() => {
      try {
        downloadSTL(config, `flora-synth-${config.seed.toString(36)}.stl`);
      } finally {
        setPrinting(false);
      }
    }, 30);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-24 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
        {/* ---------------------------------------------------------- the vase */}
        <div className="lg:sticky lg:top-24 lg:h-[calc(100svh-8rem)]">
          <div className="relative h-[52svh] min-h-[340px] overflow-hidden rounded-[1.4rem] border border-[color-mix(in_oklab,var(--gold)_45%,transparent)] bg-scene shadow-[0_30px_80px_-50px_rgba(74,22,28,0.55)] lg:h-full">
            <BouquetCanvas
              key={`${theme}-${config.palette}`}
              config={config}
              theme={theme}
              className="absolute inset-0 h-full w-full"
              compact
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 md:p-6">
              <BouquetTitle />
              <SeedReadout />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- the controls */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-[clamp(2rem,3.8vw,2.9rem)] leading-none tracking-[-0.02em]">
              The <span className="emphasis">studio</span>
            </h1>
            <div className="flex items-center gap-2">
              <AudioToggle />
              <CopyShare />
            </div>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed opacity-55">
            Every stem is generated from numbers. Change the seed for a new arrangement of the
            same species, or cross two specimens into something that has never existed.
          </p>

          <div className="mt-8">
            {/* the studio supplies its own title and copy, so the controls come bare */}
            <InstrumentControls bare />
          </div>

          <div className="mt-8 rounded-sm border border-current/10 p-5">
            <p className="font-mono text-[0.6rem] tracking-[0.24em] opacity-45">THE ARTIFACT</p>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
              Take the bouquet out of the browser. The mesh you are looking at exports as a
              watertight STL at 20:1 scale — printable, paintable, and nothing to do with glass.
            </p>
            <button
              type="button"
              onClick={exportModel}
              disabled={printing}
              className="btn btn-ghost mt-4 disabled:opacity-50"
            >
              {printing ? (
                <Loader2 size={13} className="animate-spin" aria-hidden />
              ) : (
                <Download size={13} aria-hidden />
              )}
              {printing ? "Building mesh…" : "Download STL"}
            </button>
          </div>

          <SavePanel />

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-sans text-[0.5rem] uppercase tracking-[0.26em] text-ink-soft">
            <span>Composed in the browser</span>
            <span>The link is the recipe</span>
            <span>Nothing is a photograph</span>
          </div>
        </div>
      </div>
    </div>
  );
}
