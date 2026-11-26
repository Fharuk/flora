"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Camera, Check, Dices, Loader2, RotateCcw, Share2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BouquetCanvas } from "@/components/three/bouquet-scene";
import { download, stillName } from "@/lib/capture";
import { getSpecimen } from "@/lib/hybrids";
import { shareBouquet, type ShareOutcome } from "@/lib/share";
import { useBouquetMeta, useShareUrl, useSynth } from "@/lib/store";
import {
  arrangements,
  paletteKeys,
  palettes,
  specimens,
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
  const { title, query } = useBouquetMeta();
  const shareUrl = useShareUrl();
  const [shareState, setShareState] = useState<ShareOutcome | null>(null);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  /* the canvas hands us a function that renders one frame at capture resolution */
  const shutter = useRef<(() => Promise<string | null>) | null>(null);
  const capture = useCallback((fn: (() => Promise<string | null>) | null) => {
    shutter.current = fn;
  }, []);
  const [still, setStill] = useState<"idle" | "working" | "saved" | "failed">("idle");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /*
   * One control, two behaviours. On a phone this opens the native sheet with the
   * share card attached; on a desktop, where `navigator.share` does not exist,
   * it copies the link. The button reports which one actually happened.
   */
  const share = useCallback(async () => {
    const outcome = await shareBouquet({
      url: shareUrl,
      title,
      query: `${query}&theme=${theme}`,
      text: `${title}, drawn from numbers in Flora-Synth.`,
    });
    setShareState(outcome);
    window.setTimeout(() => setShareState(null), 2200);
  }, [shareUrl, title, query, theme]);

  const saveStill = useCallback(async () => {
    if (still === "working") return;
    setStill("working");
    const url = shutter.current ? await shutter.current() : null;
    if (url) download(url, stillName("flora-synth", config.seed));
    setStill(url ? "saved" : "failed");
    window.setTimeout(() => setStill("idle"), 2400);
  }, [still, config.seed]);

  return (
    <section id="top" className="relative">
      <div className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-scene">
        <BouquetCanvas
          key={`${theme}-${config.palette}`}
          config={config}
          theme={theme}
          className="absolute inset-0 h-full w-full"
          onReady={() => setReady(true)}
          onCapture={capture}
          compact={compact}
        />

        <div aria-hidden className="pointer-events-none absolute inset-0 grain" />

        {/* top meta line */}
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-5 sm:top-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 10 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="frost flex items-center gap-3 rounded-full px-4 py-1.5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            </span>
            <span className="label label-strong whitespace-nowrap">
              {config.density} stems &middot; in the vase
            </span>
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
              transition={{ duration: 1.1, delay: 0.15, ease: EASE }}
              className="frost pointer-events-auto relative w-full max-w-[25rem] rounded-[1.6rem] p-5 sm:p-7"
            >
              {/* a gold rule across the head of the card, like the edge of a card stock */}
              <span aria-hidden className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-70" />

              <p className="label mb-3 text-[var(--gold-ink)]">
                {specimens.length} specimens &middot; cut in glass
              </p>

              <h1 className="font-title text-[clamp(2.3rem,4vw,3.1rem)] leading-[0.86] tracking-[-0.01em] text-ink">
                Flora<span className="italic text-[var(--accent)]">-</span>Synth
              </h1>

              <p className="mt-4 hidden text-[0.86rem] leading-relaxed text-ink-soft sm:block">
                Ten specimens, drawn in the browser. Every petal comes from numbers —
                <span className="italic text-ink"> nothing here is a photograph.</span>
              </p>

              <div className="mt-5 flex items-center gap-2">
                <button type="button" onClick={generate} className="btn btn-primary group flex-1">
                  <Sparkles className="h-3.5 w-3.5 transition-transform duration-700 group-hover:rotate-90" />
                  Synthesize
                </button>
                <a href="#instrument" className="btn btn-ghost">
                  Compose
                  <ArrowDown className="h-3 w-3" />
                </a>
                {/* a still and a share, icon-only, so four actions stay on one line at every width */}
                <button
                  type="button"
                  onClick={() => void saveStill()}
                  disabled={still === "working"}
                  aria-label={
                    still === "saved"
                      ? "Still saved"
                      : still === "failed"
                        ? "Could not save a still"
                        : "Save a still of this bouquet"
                  }
                  title={still === "saved" ? "Saved" : still === "failed" ? "No still" : "Save a still"}
                  className="btn btn-ghost !px-3"
                >
                  {still === "working" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : still === "saved" ? (
                    <Check className="h-3.5 w-3.5 text-[var(--gold-ink)]" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={share}
                  aria-label={
                    shareState === "copied"
                      ? "Link copied"
                      : shareState === "shared"
                        ? "Shared"
                        : shareState === "failed"
                          ? "Copy the link from the address bar"
                          : "Share this bouquet"
                  }
                  title={shareState === "copied" ? "Copied" : shareState === "shared" ? "Shared" : "Share"}
                  className="btn btn-ghost !px-3"
                >
                  {shareState === "copied" || shareState === "shared" ? (
                    <Check className="h-3.5 w-3.5 text-[var(--gold-ink)]" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.5 }}
              className="pointer-events-auto hidden text-right sm:block"
            >
              <p className="font-display text-2xl italic leading-none text-ink">{title}</p>
              <p className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-ink-soft">
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

export function InstrumentControls({ bare = false }: { bare?: boolean } = {}) {
  const config = useSynth((s) => s.config);
  const setPalette = useSynth((s) => s.setPalette);
  const setArrangement = useSynth((s) => s.setArrangement);
  const setVessel = useSynth((s) => s.setVessel);
  const setDensity = useSynth((s) => s.setDensity);
  const setBloom = useSynth((s) => s.setBloom);
  const generate = useSynth((s) => s.generate);
  const addSpecies = useSynth((s) => s.addSpecies);
  const toggleSpecies = useSynth((s) => s.toggleSpecies);
  const clearSpecies = useSynth((s) => s.clearSpecies);
  const setSpecies = useSynth((s) => s.setSpecies);

  const [dropActive, setDropActive] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropActive(false);
      const slug = e.dataTransfer.getData("text/flora-specimen");
      if (slug && getSpecimen(slug)) addSpecies(slug);
    },
    [addSpecies]
  );

  const chosen = useMemo(
    () => config.species.map((s) => getSpecimen(s)).filter(Boolean),
    [config.species]
  );

  /*
   * Two ways in. As a page section the instrument introduces itself; `bare` drops that
   * framing so the studio page can host the same controls inside its own column — the
   * full section nested in a half-width column squeezed the fields into a third of the
   * space and set the headings on top of each other.
   */
  const actions = (
    <div className="flex flex-wrap gap-2">
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
  );

  const intro = (
    <>
      <p className="eyebrow mb-5">01 — The instrument</p>
      <h2 className="display max-w-md text-[clamp(2.2rem,4.4vw,3.6rem)]">
        Regenerate until it feels <span className="emphasis">inevitable.</span>
      </h2>
      <p className="mt-5 max-w-sm text-[0.9rem] leading-relaxed text-ink-soft">
        Species, vessel, palette and posture are all inputs. The bouquet is composed by a
        deterministic engine, so the same link always returns the same arrangement — and a new
        seed always returns a different one.
      </p>
      <div className="mt-8">{actions}</div>
    </>
  );

  /* the drop target doubles as the "vase" of the control surface */
  const speciesCard = (
          <div
            ref={dropRef}
            onDragOver={(e) => {
              e.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={onDrop}
            className={cn(
              "relative mt-8 rounded-2xl border p-5 transition-all duration-500",
              dropActive
                ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]"
                : "border-[color-mix(in_oklab,var(--gold)_32%,transparent)] bg-[color-mix(in_oklab,var(--blush)_28%,transparent)]"
            )}
          >
            {/* four corner ticks — the frame of a specimen mount */}
            {[
              "left-2 top-2 border-l border-t",
              "right-2 top-2 border-r border-t",
              "left-2 bottom-2 border-b border-l",
              "right-2 bottom-2 border-b border-r",
            ].map((pos) => (
              <span
                key={pos}
                aria-hidden
                className={cn("pointer-events-none absolute h-2.5 w-2.5 border-[var(--gold)] opacity-60", pos)}
              />
            ))}
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
                    onClick={() => toggleSpecies(s.slug)}
                    className={cn(
                      "cursor-grab rounded-full border px-2.5 py-1 font-sans text-[0.55rem] uppercase tracking-[0.16em] transition-colors active:cursor-grabbing",
                      active
                        ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-ink"
                        : "border-line text-ink-soft hover:border-[color-mix(in_oklab,var(--gold)_50%,transparent)] hover:text-ink"
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
                className="mt-4 font-sans text-[0.55rem] uppercase tracking-[0.22em] text-ink-soft underline underline-offset-4 hover:text-ink"
              >
                keep only the last
              </button>
            ) : null}
          </div>
  );

  const fields = (
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
                        active
                          ? "border-[var(--gold)] shadow-[inset_0_0_0_1px_var(--gold)]"
                          : "border-line hover:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
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
                        <span className="block text-[0.8rem] leading-tight text-ink">{p.name}</span>
                        {/* wraps to two lines rather than truncating —
                            "Warm clear glass, clear…" told nobody anything */}
                        <span className="mt-1 block font-sans text-[0.48rem] uppercase leading-relaxed tracking-[0.14em] text-ink-soft">
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
                        "flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors",
                        active
                          ? "border-[var(--gold)] shadow-[inset_0_0_0_1px_var(--gold)]"
                          : "border-line hover:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
                      )}
                    >
                      <span className="text-[0.82rem] text-ink">{a.name}</span>
                      {/* stacked under the name: side-by-side forced these to four ragged lines */}
                      <span className="font-sans text-[0.5rem] uppercase leading-relaxed tracking-[0.14em] text-ink-soft">
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
                        active
                          ? "border-[var(--gold)] shadow-[inset_0_0_0_1px_var(--gold)]"
                          : "border-line hover:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
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
  );

  if (bare) {
    return (
      <div className="grid gap-8">
        {speciesCard}
        {actions}
        {fields}
      </div>
    );
  }

  return (
    <section
      id="instrument"
      className="relative overflow-hidden border-t border-line bg-paper px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto grid w-full max-w-[92rem] grid-cols-12 gap-x-8 gap-y-12">
        <div className="col-span-12 lg:col-span-4">
          {intro}
          {speciesCard}
        </div>
        <div className="col-span-12 lg:col-span-8">{fields}</div>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-[color-mix(in_oklab,var(--gold)_28%,transparent)] pb-2">
        <span className="label label-strong">{label}</span>
        <span className="max-w-[20ch] text-right font-display text-[0.9rem] italic leading-tight text-ink-soft">
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
