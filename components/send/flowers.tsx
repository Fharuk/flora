"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useMemo } from "react";

import { BouquetCanvas } from "@/components/three/bouquet-scene";

import { useSend } from "@/lib/send-store";
import { specimens } from "@/lib/specimens";

import { cn } from "@/lib/utils";

/**
 * Step one: the flowers.
 *
 * The same ten specimens as the collection, but chosen with a different question in mind.
 * In the studio you pick a species to hear what it sounds like; here you pick it because
 * it means something to one person. So the card leads with the note — the line that says
 * what the flower is *for* — and the latin name is the caption, not the headline.
 *
 * The rule is three to five. Below three a bouquet is a gesture rather than a composition;
 * above five the arrangement loses its hierarchy and every flower becomes wallpaper.
 */

const MIN = 3;
const MAX = 5;

export function FlowersStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const config = useSend((s) => s.draft.config);
  const toggle = useSend((s) => s.patch);

  const chosen = config.species;
  const canProceed = chosen.length >= MIN;

  const count = useMemo(() => chosen.length, [chosen]);

  const toggleSpecies = (slug: string) => {
    const has = chosen.includes(slug);
    if (has) {
      if (chosen.length <= 1) return;
      toggle({ config: { ...config, species: chosen.filter((s) => s !== slug) } });
      return;
    }
    if (chosen.length >= MAX) {
      // replace the oldest rather than refuse: the sixth click should do something
      toggle({ config: { ...config, species: [...chosen.slice(1), slug] } });
      return;
    }
    toggle({ config: { ...config, species: [...chosen, slug] } });
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_0.86fr] lg:gap-12">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-55">
              {count} of {MAX} chosen
            </p>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-45">
              choose at least {MIN}
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {specimens.map((spec, i) => {
              const selected = chosen.includes(spec.slug);
              const order = chosen.indexOf(spec.slug);
              return (
                <li key={spec.slug}>
                  <motion.button
                    type="button"
                    onClick={() => toggleSpecies(spec.slug)}
                    aria-pressed={selected}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.025, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      "group relative flex h-full w-full items-start gap-3 rounded-sm border p-3.5 text-left transition-colors",
                      selected
                        ? "border-[var(--gold-ink)] bg-current/[0.045]"
                        : "border-current/12 hover:border-current/28"
                    )}
                  >
                    {/* the specimen's own petal colours, as a swatch — no photograph needed */}
                    <span
                      className="mt-0.5 h-9 w-9 shrink-0 rounded-full ring-1 ring-black/5"
                      style={{
                        background: `radial-gradient(circle at 32% 28%, ${spec.colours.petal[0]}, ${spec.colours.petal[1]} 62%, ${spec.colours.stem} 100%)`,
                      }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-[1.02rem] leading-tight">{spec.name}</span>
                        {selected ? (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--gold-ink)] text-[var(--paper)]">
                            <Check size={9} strokeWidth={3} aria-hidden />
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block font-display text-[0.78rem] italic leading-snug opacity-60">
                        {spec.note}
                      </span>
                      <span className="mt-1 block font-mono text-[0.5rem] uppercase tracking-[0.18em] opacity-35">
                        {spec.latin}
                      </span>
                    </span>
                    {selected && order >= 0 ? (
                      <span className="absolute -left-px top-3 h-[calc(100%-1.5rem)] w-[2px] bg-[var(--gold-ink)]" aria-hidden />
                    ) : null}
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* --------------------------------------------------------- the preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-[1.3rem] border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-scene">
            <div className="h-[46svh] min-h-[280px] lg:h-[38rem]">
              <BouquetCanvas
                key={`${config.vessel}-${config.palette}`}
                config={config}
                theme="light"
                className="h-full w-full"
                compact
                label={`Preview of the bouquet you are composing: ${chosen.length} species so far.`}
              />
            </div>
          </div>
          <p className="mt-3 text-center font-mono text-[0.55rem] uppercase tracking-[0.24em] opacity-40">
            Nothing here is a photograph
          </p>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} disabled={!canProceed} hint={canProceed ? undefined : `Choose ${MIN - count} more`} />
    </>
  );
}

/**
 * The footer, local to this step because the preview column changes the layout.
 * Kept here rather than in `StepFrame` so the sticky preview can sit beside it.
 */
export function StepNav({
  onBack,
  onNext,
  disabled,
  hint,
  label = "Greenery",
}: {
  onBack?: () => void;
  onNext: () => void;
  disabled?: boolean;
  hint?: string;
  label?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-current/10 bg-[var(--paper)]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 md:px-8">
        <button type="button" onClick={onBack} disabled={!onBack} className="btn btn-ghost disabled:invisible">
          Back
        </button>
        <div className="flex items-center gap-3">
          {hint ? (
            <span className="hidden font-mono text-[0.55rem] uppercase tracking-[0.2em] opacity-50 sm:block">{hint}</span>
          ) : null}
          <button type="button" onClick={onNext} disabled={disabled} className="btn btn-primary disabled:opacity-40">
            {label} →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- greenery */

/**
 * Step two: the greenery.
 *
 * Its own step because it is a different decision from the flowers, not a detail of them.
 * Foliage decides the silhouette and the value structure of the whole bouquet — a bunch of
 * dark ruscus reads as formal, a fern reads as loose — while the flowers decide the colour.
 * Two axes, two questions, two steps.
 *
 * This is also where the site does something the reference product cannot: its greenery is
 * a flat WebP layered behind the blooms. Here it is generated, so the leaves are lit, cast
 * no two identical shadows, and change with the seed.
 */
