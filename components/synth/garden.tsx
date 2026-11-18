"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

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

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-[19rem] shrink-0 overflow-hidden rounded-sm border border-current/10 bg-current/[0.02] p-4 text-left transition-colors hover:bg-current/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[0.6rem] tracking-[0.28em] opacity-45">{entry.code}</span>
        <span className="font-mono text-[0.6rem] tracking-[0.18em] opacity-35">
          {relative(entry.created_at)}
        </span>
      </div>

      <p className="mt-3 font-serif text-lg leading-tight tracking-tight">{entry.title}</p>

      <div className="mt-3 flex items-center gap-1.5" aria-hidden>
        {species.map((spec, i) => (
          <span
            key={`${spec!.slug}-${i}`}
            className="h-2.5 w-2.5 rounded-full ring-1 ring-current/20"
            style={{
              background: `linear-gradient(140deg, ${spec!.colours.petal[0]}, ${spec!.colours.petal[1]})`,
            }}
          />
        ))}
        <span className="ml-1 font-mono text-[0.58rem] tracking-[0.16em] opacity-40">
          {entry.density} stems
        </span>
      </div>

      {entry.message ? (
        <p className="mt-3 line-clamp-2 text-[0.8rem] leading-snug opacity-55">“{entry.message}”</p>
      ) : (
        <p className="mt-3 font-mono text-[0.58rem] tracking-[0.16em] opacity-35">
          {entry.creator ? `signed ${entry.creator}` : `seed ${entry.seed.toString(36).toUpperCase()}`}
        </p>
      )}
    </button>
  );
}

export function Garden() {
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
            <p className="font-mono text-[0.62rem] tracking-[0.34em] opacity-45">06 — The garden</p>
            <h2 className="mt-4 font-serif text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.02] tracking-[-0.02em]">
              Everything anyone has made.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed opacity-55">
            Saved compositions are public and permanent. Open one to load it back into the
            instrument — the arrangement, not a picture of it.
          </p>
        </div>

        {!enabled ? (
          <p className="mt-14 rounded-sm border border-current/10 p-6 font-mono text-[0.66rem] leading-relaxed tracking-[0.16em] opacity-45">
            NO DATABASE ATTACHED — compositions stay in the URL and can still be shared as a link.
          </p>
        ) : visible.length === 0 ? (
          <p className="mt-14 rounded-sm border border-dashed border-current/15 p-10 text-center font-mono text-[0.66rem] tracking-[0.18em] opacity-40">
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
            className="group inline-flex items-center gap-2 border-b border-current/25 pb-1 font-mono text-[0.66rem] tracking-[0.22em] transition-colors hover:border-current/60"
            whileHover={{ x: 2 }}
          >
            OPEN THE STUDIO
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </motion.a>
          <p className="font-mono text-[0.6rem] tracking-[0.18em] opacity-35">
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
          <p className="font-mono text-[0.6rem] tracking-[0.24em] opacity-45">GIFT CODE</p>
          <p className="font-serif text-2xl tracking-[0.12em]">{code}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copy}
              className="rounded-sm border border-current/20 px-3 py-2 font-mono text-[0.6rem] tracking-[0.2em] transition-colors hover:bg-current/5"
            >
              {copied ? "COPIED" : "COPY GIFT LINK"}
            </button>
            <a
              href={`/gift/${code}`}
              className="font-mono text-[0.6rem] tracking-[0.2em] opacity-55 underline-offset-4 hover:underline"
            >
              OPEN THE UNBOXING →
            </a>
          </div>
          <p className="break-all font-mono text-[0.58rem] leading-relaxed opacity-35">{giftUrl}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-mono text-[0.6rem] tracking-[0.24em] opacity-45">
            SAVE TO THE GARDEN
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="signed…"
              maxLength={48}
              className="w-full rounded-sm border border-current/15 bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-30 focus:border-current/40"
            />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="a note for the recipient"
              maxLength={180}
              className="w-full rounded-sm border border-current/15 bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-30 focus:border-current/40"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={state === "saving"}
            className="w-full rounded-sm border border-current/25 py-2.5 font-mono text-[0.62rem] tracking-[0.24em] transition-colors hover:bg-current/5 disabled:opacity-40"
          >
            {state === "saving" ? "SAVING…" : "SAVE & GET A GIFT CODE"}
          </button>
          {state === "error" ? (
            <p className="font-mono text-[0.58rem] leading-relaxed tracking-[0.14em] opacity-45">
              COULD NOT SAVE — THE LINK ABOVE STILL WORKS.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
