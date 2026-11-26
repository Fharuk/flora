"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/stamen/util";
import { useLive } from "./useLive";

/**
 * The accessible path through the film.
 *
 * The film is a single scrolling screen whose content appears and disappears with
 * opacity. That is fine for a sighted viewer with a mouse and a fine frame rate,
 * and hostile to almost everyone else:
 *
 *   - a screen reader reads all five chapters at once, including the beats that
 *     are currently invisible, because `opacity: 0` does not hide anything;
 *   - a keyboard user tabbing through sees the page scroll out from under them,
 *     because there is no focus management and no landmark for the current place;
 *   - someone who asked for reduced motion gets a shorter animation but the same
 *     endless scroll;
 *   - and nobody can tell where they are except by looking at the scenery.
 *
 * This component fixes the parts that live in the DOM: a live region that
 * announces the chapter as it changes, a chapter nav with `aria-current`, and a
 * switch to a flat, static reading of the film for reduced motion.
 */

const CHAPTERS: { id: string; label: string; title: string }[] = [
  { id: "bloom", label: "The film", title: "A bouquet opens over three days of window light" },
  { id: "scatter", label: "Scatter", title: "The petals let go" },
  { id: "closer", label: "Up close", title: "Inside the anemone" },
  { id: "stems", label: "The stems", title: "Ten specimens, one at a time" },
  { id: "build", label: "Compose", title: "Build the mount" },
  { id: "care", label: "Care", title: "How to keep it" },
];

/** announcements, phrased for a reader rather than for a screen */
const ANNOUNCE: Record<string, string> = {
  bloom: "Chapter one, the film. A bouquet opens.",
  scatter: "Chapter two, the petals scatter.",
  closer: "Chapter three, up close.",
  stems: "Chapter four, the ten specimens.",
  build: "Chapter five, compose.",
  care: "Chapter six, care.",
};

export function ChapterRail() {
  const scene = useLive("scene");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav aria-label="Chapters" className="pointer-events-auto fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
      <ol className="flex flex-col gap-1">
        {CHAPTERS.map((c) => {
          const current = mounted && scene === c.id;
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={current ? "location" : undefined}
                onClick={(e) => {
                  /* the film's own scroll, not the browser's jump */
                  e.preventDefault();
                  document.getElementById(c.id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
                }}
                className="group flex items-center gap-2.5 rounded py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--magenta)]"
              >
                <span
                  aria-hidden
                  className="block h-px transition-all duration-500"
                  style={{
                    width: current ? 22 : 10,
                    background: current ? "var(--magenta)" : "color-mix(in srgb, var(--ink) 34%, transparent)",
                  }}
                />
                <span
                  className="stamen-mono text-[10px] uppercase tracking-[0.2em] transition-opacity duration-300"
                  style={{ opacity: current ? 1 : 0.42 }}
                >
                  {c.label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Announces the chapter change once, politely.
 *
 * `aria-live="polite"` rather than assertive: the reader is scrolling, not being
 * interrupted, and a chapter announcement that cuts across whatever they are
 * hearing is worse than one that waits.
 */
export function ChapterAnnouncer() {
  const scene = useLive("scene");
  const [text, setText] = useState("");
  const last = useRef("");

  useEffect(() => {
    if (!scene || scene === last.current) return;
    last.current = scene;
    const line = ANNOUNCE[scene];
    if (line) setText(line);
  }, [scene]);

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
    </p>
  );
}

/**
 * A static reading of the film, for reduced motion.
 *
 * "Reduced motion" should not mean "a shorter animation of the same thing". It
 * means the content, without the theatre: every chapter's words, in order, on one
 * page, no sticky stages, no scroll-jacking, no canvas. The film's own components
 * are built around pinned stages, so rather than fight them this renders the
 * chassis — the copy — and leaves the set behind.
 */
export function FilmEssay() {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /*
   * Mark the document while the essay is up, so the film's own chapters are
   * hidden rather than merely un-animated: an essay laid over a canvas is two
   * texts at once.
   */
  useEffect(() => {
    if (reduced !== true) return;
    const root = document.documentElement;
    root.dataset.stamenEssay = "on";
    return () => {
      delete root.dataset.stamenEssay;
    };
  }, [reduced]);

  /* null until we know: never render the essay over the film for a frame */
  if (reduced !== true) return null;

  return (
    <section id="essay" aria-labelledby="essay-title" className="relative z-20 mx-auto max-w-[46rem] px-6 py-24">
      <p className="stamen-mono text-[10px] uppercase tracking-[0.28em] opacity-50">The film, as text</p>
      <h2 id="essay-title" className="stamen-serif mt-4 text-[clamp(2rem,5vw,3.2rem)] leading-[1.02]">
        Ten specimens, drawn from numbers.
      </h2>
      <ol className="mt-12 space-y-10">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <p className="stamen-mono text-[10px] uppercase tracking-[0.24em] opacity-45">
              {String(i + 1).padStart(2, "0")} — {c.label}
            </p>
            <h3 className="stamen-serif mt-2 text-[1.5rem] leading-tight">{c.title}</h3>
          </li>
        ))}
      </ol>
      <p className="mt-12 text-[0.95rem] leading-relaxed opacity-70">
        The film itself is motion, and you have asked for less of it. Everything it argues is above; the
        instrument at <a className="underline underline-offset-4" href="/compose">/compose</a> is where the
        bouquet is built.
      </p>
    </section>
  );
}
