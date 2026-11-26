"use client";

import { useMemo } from "react";

import { StepNav } from "@/components/send/flowers";
import { BouquetCanvas } from "@/components/three/bouquet-scene";
import { FOLIAGE, foliageKeys } from "@/lib/foliage";
import { useSend } from "@/lib/send-store";
import { cn } from "@/lib/utils";

/**
 * Step two: the greenery.
 *
 * Its own step because it is a different decision from the flowers, not a detail of them.
 * Foliage decides the silhouette and the value structure of a bouquet — a bunch of dark
 * ruscus reads as formal, a fern reads as loose — while the flowers decide the colour.
 * Two axes, two questions, two steps.
 *
 * It is also where this differs from a site that layers a flat photograph of leaves behind
 * the blooms: this greenery is generated. Five archetypes, each carrying its own leaf
 * shape, posture, spacing and colour, lit by the same key light as the flowers, and the
 * same recipe always grows the same sprays.
 */
export function GreeneryStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const config = useSend((s) => s.draft.config);
  const patch = useSend((s) => s.patch);

  const choices = useMemo(
    () =>
      foliageKeys.map((key) => ({
        key,
        archetype: key === "none" ? null : FOLIAGE[key],
      })),
    []
  );

  const choose = (key: (typeof foliageKeys)[number]) => {
    // the foliage lives on the config so the link, the row and the engine all agree
    patch({ config: { ...config, foliage: key } });
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[0.94fr_1fr] lg:gap-12">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-55">
              how the bouquet sits
            </p>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-45">optional</p>
          </div>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {choices.map(({ key, archetype }) => {
              const selected = config.foliage === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => choose(key)}
                    aria-pressed={selected}
                    className={cn(
                      "group flex h-full w-full items-start gap-3 rounded-sm border p-3.5 text-left transition-colors",
                      selected
                        ? "border-[var(--gold-ink)] bg-current/[0.045]"
                        : "border-current/12 hover:border-current/28"
                    )}
                  >
                    {/* the archetype's two leaf colours, as a swatch */}
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-black/5"
                      style={{
                        background: archetype
                          ? `linear-gradient(145deg, ${archetype.colour[0]}, ${archetype.colour[1]})`
                          : "repeating-linear-gradient(45deg, transparent, transparent 3px, currentColor 3px, currentColor 4px)",
                        opacity: archetype ? 1 : 0.18,
                      }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[1.02rem] leading-tight">
                        {archetype ? archetype.name : "No greenery"}
                      </span>
                      <span className="mt-0.5 block font-display text-[0.78rem] italic leading-snug opacity-60">
                        {archetype ? archetype.note : "Blooms and a vessel alone."}
                      </span>
                      {archetype ? (
                        <span className="mt-1 block font-mono text-[0.5rem] uppercase tracking-[0.18em] opacity-35">
                          {archetype.latin}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-5 max-w-[30rem] text-[0.82rem] leading-relaxed opacity-55">
            Greenery is what makes the glass read as expensive: without something matte behind them, the
            flowers have nothing to be brighter than. Change it and watch the silhouette move — the leaves
            are drawn from the same seed as the blooms, so they arrive in a different arrangement every time.
          </p>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-[1.3rem] border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-scene">
            <div className="h-[46svh] min-h-[280px] lg:h-[34rem]">
              <BouquetCanvas
                key={`greenery-${config.foliage}-${config.seed}`}
                config={config}
                theme="light"
                className="h-full w-full"
                compact
                label={`Preview of the bouquet with ${config.foliage === "none" ? "no greenery" : `${FOLIAGE[config.foliage].name} greenery`}.`}
              />
            </div>
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} label="Arrange" />
    </>
  );
}
