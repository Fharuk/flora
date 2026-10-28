"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Check, Copy, Dices, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BouquetCanvas } from "@/components/three/bouquet-scene";
import { useBouquetMeta, useShareUrl, useSynth } from "@/lib/store";
import {
  arrangements,
  paletteKeys,
  palettes,
  specimens,
  specimenBySlug,
  vessels,
} from "@/lib/specimens";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The instrument: a full-bleed real-time render with the control surface floating over it.
 * The canvas never remounts when a control changes — only uniforms and geometry inputs do.
 */
export function Instrument({ children }: { children?: React.ReactNode }) {
  const config = useSynth((s) => s.config);
  const theme = useSynth((s) => s.theme);
  const generation = useSynth((s) => s.generation);
  const generate = useSynth((s) => s.generate);
  const { title } = useBouquetMeta();
  const shareUrl = useShareUrl();
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  return (
    <section id="top" className="relative">
      <div className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-scene">
        <BouquetCanvas
          key={`${theme}-${config.palette}`}
          config={config}
          theme={theme}
          className="absolute inset-0 h-full w-full"
          onReady={() => setReady(true)}
          compact={compact}
        />

        <div aria-hidden className="pointer-events-none absolute inset-0 grain" />

        {/* top meta line */}
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-5 sm:top-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 10 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="frost flex items-center gap-3 rounded-full px-4 py-2"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="label label-strong whitespace-nowrap">Live · {config.density} stems</span>
            <span aria-hidden className="hidden h-3 w-px bg-[var(--line-strong)] sm:block" />
            <span className="label hidden whitespace-nowrap sm:inline">{title}</span>
          </motion.div>
        </div>

        {/* hero: an editorial label, bottom-left, so the vessel stays in view */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-7 sm:px-8 sm:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: EASE }}
              className="frost pointer-events-auto w-full max-w-[24rem] rounded-[1.4rem] p-4 sm:p-6"
            >
              <p className="label mb-2.5">{specimens.length} specimens · glass &amp; chrome</p>
              <h1 className="display text-[clamp(2.1rem,3.6vw,2.9rem)] leading-[0.9] text-ink">
                Flora-Synth
              </h1>
              <p className="mt-3 hidden text-[0.8rem] leading-relaxed text-ink-soft sm:block">
                An instrument for composing impossible bouquets. Every petal is generated in the
                browser — nothing is a photograph.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
                <button type="button" onClick={generate} className="btn btn-primary group">
                  <Sparkles className="h-4 w-4 transition-transform duration-500 group-hover:rotate-90" />
                  Synthesize
                </button>
                <a href="#instrument" className="btn btn-ghost">
                  Compose
                  <ArrowDown className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={copy}
                  aria-label="Copy a link to this bouquet"
                  className="btn btn-ghost"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Share"}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.5 }}
              className="pointer-events-auto hidden text-right sm:block"
            >
              <p className="label mb-1">{title}</p>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
                seed {config.seed.toString(36).toUpperCase()} · gen{" "}
                {String(generation).padStart(3, "0")}
              </p>
            </motion.div>
          </div>
        </div>

      </div>

      {children}
    </section>
  );
}

/* --------------------------------------------------------------- controls */

export function InstrumentControls() {
  const config = useSynth((s) => s.config);
  const setPalette = useSynth((s) => s.setPalette);
  const setArrangement = useSynth((s) => s.setArrangement);
  const setVessel = useSynth((s) => s.setVessel);
  const setDensity = useSynth((s) => s.setDensity);
  const setBloom = useSynth((s) => s.setBloom);
  const generate = useSynth((s) => s.generate);
  const addSpecies = useSynth((s) => s.addSpecies);
  const clearSpecies = useSynth((s) => s.clearSpecies);
  const setSpecies = useSynth((s) => s.setSpecies);

  const [dropActive, setDropActive] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropActive(false);
      const slug = e.dataTransfer.getData("text/flora-specimen");
      if (slug && specimenBySlug.has(slug)) addSpecies(slug);
    },
    [addSpecies]
  );

  const chosen = useMemo(
    () => config.species.map((s) => specimenBySlug.get(s)).filter(Boolean),
    [config.species]
  );

  return (
    <section id="instrument" className="relative border-t border-line bg-paper px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto grid w-full max-w-[92rem] grid-cols-12 gap-x-8 gap-y-12">
        <div className="col-span-12 lg:col-span-4">
          <p className="label mb-5">01 — The instrument</p>
          <h2 className="display max-w-md text-[clamp(2.2rem,4.4vw,3.6rem)]">
            Regenerate until it feels <span className="italic text-accent">inevitable.</span>
          </h2>
          <p className="mt-5 max-w-sm text-[0.9rem] leading-relaxed text-ink-soft">
            Species, vessel, palette and posture are all inputs. The bouquet is composed by a
            deterministic engine, so the same link always returns the same arrangement — and a new
            seed always returns a different one.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <button type="button" onClick={generate} className="btn btn-primary">
              <Dices className="h-4 w-4" />
              New seed
            </button>
            <button
              type="button"
              onClick={() => {
                setSpecies(["ghost-orchid", "cafe-au-lait-dahlia", "persian-ranunculus"]);
                generate();
              }}
              className="btn btn-ghost"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Curator's choice
            </button>
          </div>

          {/* the drop target doubles as the "vase" of the control surface */}
          <div
            ref={dropRef}
            onDragOver={(e) => {
              e.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={onDrop}
            className={cn(
              "mt-8 rounded-2xl border border-dashed p-5 transition-colors duration-300",
              dropActive ? "border-accent bg-accent/10" : "border-[var(--line-strong)]"
            )}
          >
            <p className="label mb-3">{dropActive ? "Release to add" : "Drag a specimen here"}</p>
            <div className="flex flex-wrap gap-1.5">
              {specimens.map((s) => {
                const active = config.species.includes(s.slug);
                return (
                  <button
                    key={s.slug}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/flora-specimen", s.slug);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => addSpecies(s.slug)}
                    className={cn(
                      "cursor-grab rounded-full border px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors active:cursor-grabbing",
                      active
                        ? "border-accent/60 bg-accent/12 text-ink"
                        : "border-line text-ink-soft hover:border-[var(--line-strong)] hover:text-ink"
                    )}
                    aria-pressed={active}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            {chosen.length ? (
              <button
                type="button"
                onClick={clearSpecies}
                className="mt-4 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-ink-soft underline underline-offset-4 hover:text-ink"
              >
                keep only the last
              </button>
            ) : null}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-9 sm:grid-cols-2">
            <Field label="Palette" hint="Glass tint and key light">
              <div className="grid grid-cols-2 gap-2">
                {paletteKeys.map((key) => {
                  const p = palettes[key];
                  const active = config.palette === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPalette(key)}
                      aria-pressed={active}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                        active ? "border-ink" : "border-line hover:border-[var(--line-strong)]"
                      )}
                    >
                      <span
                        aria-hidden
                        className="h-9 w-9 shrink-0 rounded-md"
                        style={{
                          background: `linear-gradient(140deg, ${p.swatch[0]}, ${p.swatch[1]})`,
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block text-[0.8rem] text-ink">{p.name}</span>
                        <span className="block truncate font-mono text-[0.55rem] uppercase tracking-[0.12em] text-ink-soft">
                          {p.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Arrangement" hint="How the stems are set">
              <div className="space-y-1.5">
                {arrangements.map((a) => {
                  const active = config.arrangement === a.key;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setArrangement(a.key)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-baseline justify-between gap-4 rounded-lg border px-3 py-2 text-left transition-colors",
                        active ? "border-ink" : "border-line hover:border-[var(--line-strong)]"
                      )}
                    >
                      <span className="text-[0.82rem] text-ink">{a.name}</span>
                      <span className="max-w-[16ch] text-right font-mono text-[0.55rem] uppercase leading-tight tracking-[0.1em] text-ink-soft">
                        {a.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Vessel" hint="The glass it stands in">
              <div className="grid grid-cols-3 gap-2">
                {vessels.map((v) => {
                  const active = config.vessel === v.key;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setVessel(v.key)}
                      aria-pressed={active}
                      className={cn(
                        "group rounded-xl border p-3 text-left transition-colors",
                        active ? "border-ink" : "border-line hover:border-[var(--line-strong)]"
                      )}
                    >
                      <VesselGlyph kind={v.key} active={active} />
                      <span className="mt-2 block text-[0.78rem] text-ink">{v.name}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Density & opening" hint="Stems · how far the flowers have opened">
              <div className="space-y-6 pt-1">
                <Slider
                  label="Stems"
                  value={config.density}
                  min={3}
                  max={11}
                  step={1}
                  display={`${config.density}`}
                  onChange={setDensity}
                />
                <Slider
                  label="Opening"
                  value={config.bloom}
                  min={0.15}
                  max={1}
                  step={0.01}
                  display={`${Math.round(config.bloom * 100)}%`}
                  onChange={setBloom}
                />
              </div>
            </Field>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <span className="label label-strong">{label}</span>
        <span className="max-w-[18ch] text-right font-mono text-[0.55rem] uppercase leading-tight tracking-[0.1em] text-ink-soft">
          {hint}
        </span>
      </div>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-3 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="font-mono text-[0.68rem] text-ink">{display}</span>
      </span>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

function VesselGlyph({ kind, active }: { kind: string; active: boolean }) {
  const stroke = active ? "var(--ink)" : "var(--ink-soft)";
  const paths: Record<string, string> = {
    bulb: "M14 4h12M16 4c0 6-6 9-6 16s5 10 10 10 10-3 10-10-6-10-6-16",
    flute: "M17 3h6M18 3v6c0 5-4 7-4 14s3 9 7 9 7-2 7-9-4-9-4-14V3",
    tide: "M8 8h24M10 8c-1 6-4 8-4 13s4 8 9 8h6c5 0 9-3 9-8s-3-7-4-13",
  };
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-full" aria-hidden fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round">
      <path d={paths[kind] ?? paths.bulb} />
    </svg>
  );
}
