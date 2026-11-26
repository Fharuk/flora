"use client";

import { Dices } from "lucide-react";

import { StepNav } from "@/components/send/flowers";
import { BouquetCanvas } from "@/components/three/bouquet-scene";
import { useSend } from "@/lib/send-store";
import { arrangements, paletteKeys, palettes, vessels } from "@/lib/specimens";
import { cn } from "@/lib/utils";

/**
 * Step three: the arrangement.
 *
 * Everything here already existed in the instrument — seed, density, bloom, palette,
 * vessel, arrangement — but the studio presents it as a cockpit, because the studio is
 * for people who want to play. This is the same engine asked a different question: not
 * "what happens if I do this", but "which of these is the one I send".
 *
 * So the controls are fewer, the copy is about the recipient rather than the algorithm,
 * and the seed is a single button rather than a numeric dial.
 */

export function ArrangeStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const config = useSend((s) => s.draft.config);
  const patch = useSend((s) => s.patch);
  const reseed = useSend((s) => s.reseed);

  const set = (value: Partial<typeof config>) => patch({ config: { ...config, ...value } });

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:gap-12">
        {/* ----------------------------------------------------------- the cockpit */}
        <div className="space-y-7">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">
                The arrangement
              </span>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] opacity-40">
                seed {config.seed.toString(36)}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {arrangements.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => set({ arrangement: a.key })}
                  aria-pressed={config.arrangement === a.key}
                  className={cn(
                    "rounded-sm border px-3 py-2.5 text-left transition-colors",
                    config.arrangement === a.key
                      ? "border-[var(--gold-ink)] bg-current/[0.045]"
                      : "border-current/12 hover:border-current/28"
                  )}
                >
                  <span className="block font-display text-[0.95rem] leading-tight">{a.name}</span>
                  <span className="mt-0.5 block text-[0.68rem] leading-snug opacity-50">{a.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Slider
              label="Stems"
              value={config.density}
              min={3}
              max={11}
              onChange={(density) => set({ density })}
              readout={`${config.density}`}
            />
            <Slider
              label="Bloom"
              value={Math.round(config.bloom * 100)}
              min={15}
              max={100}
              onChange={(bloom) => set({ bloom: bloom / 100 })}
              readout={`${Math.round(config.bloom * 100)}%`}
            />
          </div>

          <div>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">Vessel</span>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {vessels.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => set({ vessel: v.key })}
                  aria-pressed={config.vessel === v.key}
                  className={cn(
                    "rounded-sm border px-2.5 py-2 text-left transition-colors",
                    config.vessel === v.key
                      ? "border-[var(--gold-ink)] bg-current/[0.045]"
                      : "border-current/12 hover:border-current/28"
                  )}
                >
                  <span className="block font-display text-[0.9rem] leading-tight">{v.name}</span>
                  <span className="mt-0.5 block text-[0.62rem] leading-snug opacity-50">{v.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">Palette</span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {paletteKeys.map((key) => {
                const p = palettes[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set({ palette: key })}
                    aria-pressed={config.palette === key}
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 transition-colors",
                      config.palette === key ? "border-[var(--gold-ink)]" : "border-current/12 hover:border-current/28"
                    )}
                  >
                    <span
                      className="h-6 w-6 rounded-full ring-1 ring-black/10"
                      style={{ background: `linear-gradient(140deg, ${p.swatch[0]}, ${p.swatch[1]})` }}
                      aria-hidden
                    />
                    <span className="font-mono text-[0.56rem] uppercase tracking-[0.16em]">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-sm border border-current/10 px-4 py-3">
            <div>
              <p className="font-display text-[0.95rem] leading-tight">Not this arrangement</p>
              <p className="mt-0.5 text-[0.72rem] opacity-50">
                A new seed rearranges the same species. Nothing else changes.
              </p>
            </div>
            <button type="button" onClick={reseed} className="btn btn-ghost shrink-0 gap-2">
              <Dices size={13} aria-hidden />
              Reroll
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------- preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-[1.3rem] border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-scene">
            <div className="h-[46svh] min-h-[280px] lg:h-[40rem]">
              <BouquetCanvas
                key={`arrange-${config.seed}-${config.palette}`}
                config={config}
                theme="light"
                className="h-full w-full"
                compact
                label="The bouquet you are arranging, drawn in 3D."
              />
            </div>
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} label="The card" />
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  readout,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  readout: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60" htmlFor={`slider-${label}`}>
          {label}
        </label>
        <span className="font-mono text-[0.6rem] tabular-nums opacity-45">{readout}</span>
      </div>
      <input
        id={`slider-${label}`}
        type="range"
        className="range mt-3 w-full"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
