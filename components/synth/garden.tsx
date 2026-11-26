"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BouquetThumb } from "@/components/three/bouquet-thumb";
import { KeepButton } from "@/components/synth/shelf";
import { decodeBouquet, encodeBouquet } from "@/lib/bouquet";
import type { GardenEntry } from "@/lib/garden";
import { getSpecimen } from "@/lib/hybrids";
import { useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * The garden.
 *
 * Every composition that has been saved to the shared record scrolls past here, newest
 * first. Clicking one loads it back into the instrument above — so the page is not a
 * portfolio of screenshots, it is a set of live arrangements that can be reopened and
 * edited by anyone.
 *
 * Polled rather than subscribed: the browser holds no database credential, and a 20-second
 * refresh on a list of two dozen rows costs less than shipping an anon key to every visitor.
 */

const POLL_MS = 20_000;

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function useGarden() {
  const [entries, setEntries] = useState<GardenEntry[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/garden", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { entries: GardenEntry[]; enabled: boolean };
        if (!alive) return;
        setEntries(data.entries ?? []);
        setEnabled(data.enabled !== false);
      } catch {
        /* offline or no database — leave whatever is already on screen */
      } finally {
        if (alive) setLoaded(true);
      }
    };
    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return { entries, enabled, loaded };
}

function EntryCard({ entry, onOpen }: { entry: GardenEntry; onOpen: () => void }) {
  const species = useMemo(
    () => entry.species.map((slug) => getSpecimen(slug)).filter(Boolean),
    [entry.species]
  );

  const theme = useSynth((s) => s.theme);
  const config = useMemo(() => decodeBouquet(entry.config), [entry.config]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-love group relative h-[19rem] w-[19rem] shrink-0 overflow-hidden rounded-2xl p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
    >
      {/*
        * The composition itself, not a swatch of its colours. This is the whole
        * claim of the project made visible: the card is drawn from the same eight
        * numbers in the URL as the instrument.
        */}
      <BouquetThumb
        config={config}
        theme={theme}
        /*
         * The card is where the project's claim becomes visible, so the drawing
         * has to actually be visible: at 40% over the card's own ground it read
         * as a watermark and the thumbnails may as well have been swatches again.
         * The type sits above it and the scrim below carries the contrast.
         */
        className="pointer-events-none absolute inset-0 h-full w-full opacity-80 transition-opacity duration-700 group-hover:opacity-100"
      />
      {/*
        * Two scrims, because the card's text occupies the top and the bouquet the
        * bottom. The render is bright enough to be visible but a flower head
        * landing behind "11 stems" made the label unreadable; paper laid over the
        * top of the card, fading out before the vessel, keeps both legible.
        */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-[var(--paper)] via-[color-mix(in_oklab,var(--paper)_78%,transparent)] to-transparent"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-[color-mix(in_oklab,var(--paper)_94%,transparent)] via-[color-mix(in_oklab,var(--paper)_72%,transparent)] to-transparent"
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.26em] text-[var(--gold-ink)]">
            {entry.code}
          </span>
          <span className="font-sans text-[0.5rem] uppercase tracking-[0.22em] text-ink-soft">
            {relative(entry.created_at)}
          </span>
        </div>

        <p className="mt-3 font-display text-[1.35rem] leading-tight tracking-[-0.01em] text-ink">
          {entry.title}
        </p>

        <div className="mt-3 flex items-center gap-1.5" aria-hidden>
          {species.map((spec, i) => (
            <span
              key={`${spec!.slug}-${i}`}
              className="h-2.5 w-2.5 rounded-full ring-1 ring-[color-mix(in_oklab,var(--gold)_50%,transparent)]"
              style={{
                background: `linear-gradient(140deg, ${spec!.colours.petal[0]}, ${spec!.colours.petal[1]})`,
              }}
            />
          ))}
          <span className="ml-1 font-sans text-[0.5rem] uppercase tracking-[0.2em] text-ink-soft">
            {entry.density} stems
          </span>
        </div>

        {entry.message ? (
          <p className="mt-3 line-clamp-2 font-display text-[0.95rem] italic leading-snug text-ink-soft">
            “{entry.message}”
          </p>
        ) : (
          <p className="mt-3 font-sans text-[0.5rem] uppercase tracking-[0.2em] text-ink-soft">
            {entry.creator ? `signed ${entry.creator}` : `seed ${entry.seed.toString(36).toUpperCase()}`}
          </p>
        )}
      </div>
    </button>
  );
}

export function Garden({ headingLevel = 2 }: { headingLevel?: 1 | 2 } = {}) {
  const { entries, enabled, loaded } = useGarden();
  const applyConfig = useSynth((s) => s.applyConfig);
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const open = (entry: GardenEntry) => {
    applyConfig(decodeBouquet(entry.config));
    document.getElementById("instrument")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const visible = entries.slice(0, 12);
  // the marquee needs enough width to loop without a gap
  const looped = visible.length >= 4 ? [...visible, ...visible] : visible;

  return (
    <section id="garden" className="relative border-t border-current/10 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">06 — The garden</p>
            {headingLevel === 1 ? (
              <h1 className="mt-5 text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.02] tracking-[-0.02em]">
                Everything anyone has <span className="emphasis">made.</span>
              </h1>
            ) : (
              <h2 className="mt-5 text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.02] tracking-[-0.02em]">
                Everything anyone has <span className="emphasis">made.</span>
              </h2>
            )}
          </div>
          <p className="max-w-sm text-[0.9rem] leading-relaxed text-ink-soft">
            Saved compositions are public and permanent. Open one to load it back into the
            instrument — the arrangement, not a picture of it.
          </p>
        </div>

        {!enabled ? (
          <p className="mt-14 rounded-sm border border-current/10 p-6 font-sans text-[0.6rem] leading-relaxed tracking-[0.2em] opacity-45">
            NO DATABASE ATTACHED — compositions stay in the URL and can still be gifted as a link.
          </p>
        ) : visible.length === 0 ? (
          <p className="mt-14 rounded-sm border border-dashed border-current/15 p-10 text-center font-sans text-[0.6rem] uppercase tracking-[0.24em] opacity-40">
            {loaded ? "THE GARDEN IS WAITING FOR ITS FIRST COMPOSITION" : "READING THE GARDEN…"}
          </p>
        ) : (
          <div
            ref={track}
            className="relative mt-14 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className={cn(
                "flex w-max gap-4",
                looped.length > visible.length && "garden-track",
                paused && "[animation-play-state:paused]"
              )}
            >
              {looped.map((entry, i) => (
                <EntryCard
                  key={`${entry.code}-${i}`}
                  entry={entry}
                  onOpen={() => open(entry)}
                />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--paper)] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--paper)] to-transparent" />
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
          <motion.a
            href="/studio"
            className="group inline-flex items-center gap-2 border-b border-[color-mix(in_oklab,var(--gold)_50%,transparent)] pb-1 font-sans text-[0.6rem] uppercase tracking-[0.28em] text-[var(--gold-ink)] transition-colors hover:border-[var(--gold)]"
            whileHover={{ x: 2 }}
          >
            Open the studio
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </motion.a>
          <p className="font-sans text-[0.55rem] uppercase tracking-[0.24em] text-ink-soft">
            {entries.length} COMPOSITION{entries.length === 1 ? "" : "S"} ON RECORD
          </p>
        </div>
      </div>
    </section>
  );
}

/** The share panel: keeps the URL, adds a persistent code for gifting. */
export function SavePanel() {
  const config = useSynth((s) => s.config);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [code, setCode] = useState<string | null>(null);
  const [creator, setCreator] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setState("idle");
    setCode(null);
  }, [encodeBouquet(config)]);

  const save = async () => {
    setState("saving");
    try {
      const res = await fetch("/api/garden", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: encodeBouquet(config), creator, message }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { code: string };
      setCode(data.code);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  const giftUrl = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/gift/${code}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(giftUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the URL is on screen to select */
    }
  };

  return (
    <div className="mt-6 border-t border-current/10 pt-5">
      {state === "saved" && code ? (
        <div className="space-y-3">
          <p className="label text-[var(--gold-ink)]">Gift code</p>
          <p className="font-display text-3xl tracking-[0.18em] text-ink">{code}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copy}
              className="rounded-sm border border-current/20 px-3 py-2 font-sans text-[0.55rem] uppercase tracking-[0.24em] transition-colors hover:bg-current/5"
            >
              {copied ? "COPIED" : "COPY GIFT LINK"}
            </button>
            <a
              href={`/gift/${code}`}
              className="font-sans text-[0.55rem] uppercase tracking-[0.24em] text-[var(--gold-ink)] underline-offset-4 hover:underline"
            >
              OPEN THE UNBOXING →
            </a>
          </div>
          <p className="break-all font-mono text-[0.58rem] leading-relaxed opacity-35">{giftUrl}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="label text-[var(--gold-ink)]">Save &amp; seal</p>
          {/*
            * Two ways to keep it, in the order they cost. The shelf is private,
            * instant and free; the garden is public and permanent. Offering only
            * the second asked people to publish before they could simply return.
            */}
          <div className="flex flex-wrap items-center gap-2">
            <KeepButton />
            <span className="font-sans text-[0.5rem] uppercase tracking-[0.2em] text-ink-soft">
              private · on this device
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="Your name"
              aria-label="Your name, shown on the saved composition"
              maxLength={48}
              className="w-full rounded-lg border border-[color-mix(in_oklab,var(--gold)_32%,transparent)] bg-transparent px-3 py-2.5 font-display text-[0.95rem] outline-none placeholder:italic placeholder:text-ink-soft/70 focus:border-[var(--gold)]"
            />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A dedication, if you like"
              aria-label="A dedication to go with it"
              maxLength={180}
              className="w-full rounded-lg border border-[color-mix(in_oklab,var(--gold)_32%,transparent)] bg-transparent px-3 py-2.5 font-display text-[0.95rem] outline-none placeholder:italic placeholder:text-ink-soft/70 focus:border-[var(--gold)]"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={state === "saving"}
            className="btn btn-gold w-full"
          >
            {state === "saving" ? "Sealing…" : "Seal it & get a gift code"}
          </button>
          {state === "error" ? (
            <p className="font-sans text-[0.55rem] leading-relaxed tracking-[0.2em] opacity-45">
              COULD NOT SAVE — THE LINK ABOVE STILL WORKS.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
