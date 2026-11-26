"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { shareBouquet, type ShareOutcome } from "@/lib/share";
import { useBouquetMeta, useShareUrl, useSynth } from "@/lib/store";

/** Title + seed readout, sized for an overlay on the canvas. */
export function BouquetTitle() {
  const { title } = useBouquetMeta();
  return (
    <div className="rounded-xl border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-[var(--glass)] px-3.5 py-2.5 backdrop-blur-md">
      <p className="font-display text-[1.15rem] italic leading-none tracking-tight text-ink">{title}</p>
      <p className="mt-1.5 font-sans text-[0.48rem] uppercase tracking-[0.3em] text-ink-soft">In progress</p>
    </div>
  );
}

export function SeedReadout() {
  const config = useSynth((s) => s.config);
  const generation = useSynth((s) => s.generation);
  return (
    <div className="rounded-xl border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-[var(--glass)] px-3.5 py-2.5 text-right backdrop-blur-md">
      <p className="font-mono text-[0.56rem] tracking-[0.18em] text-ink/80">
        {config.seed.toString(36).toUpperCase()}
      </p>
      <p className="mt-1.5 font-sans text-[0.46rem] uppercase tracking-[0.3em] text-ink-soft">
        gen {String(generation).padStart(3, "0")}
      </p>
    </div>
  );
}

/**
 * The share card, on the page.
 *
 * A share sheet can hand someone an image; a card you can see is how they keep
 * one. On a phone a long press on an image is the save gesture everyone already
 * knows, so the card is a real <img> pointed at the OG route rather than a
 * canvas, and the hint underneath says so.
 */
export function ShareCard() {
  const { title, query } = useBouquetMeta();
  const theme = useSynth((s) => s.theme);
  const src = `/api/og?${query}&theme=${theme}`;

  return (
    <figure className="mt-6 rounded-sm border border-current/10 p-4">
      <p className="font-mono text-[0.6rem] tracking-[0.24em] opacity-45">THE CARD</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Share card: ${title}, drawn as a specimen on a garnet ground`}
        width={1200}
        height={630}
        loading="lazy"
        className="mt-3 w-full rounded-sm border border-current/10"
      />
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 font-sans text-[0.5rem] uppercase tracking-[0.26em] text-ink-soft">
        <span>Press and hold to save the image</span>
        <a href={src} download={`flora-synth-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`} className="underline-offset-4 hover:underline">
          Download
        </a>
      </figcaption>
    </figure>
  );
}

export function CopyShare({ label = "Share" }: { label?: string }) {
  const url = useShareUrl();
  const { title, query } = useBouquetMeta();
  const theme = useSynth((s) => s.theme);
  const [state, setState] = useState<ShareOutcome | null>(null);

  /* the native sheet on a phone, the clipboard everywhere else — see lib/share.ts */
  const share = async () => {
    const outcome = await shareBouquet({
      url,
      title,
      query: `${query}&theme=${theme}`,
      text: `${title}, drawn from numbers in Flora-Synth.`,
    });
    setState(outcome);
    window.setTimeout(() => setState(null), 1800);
  };

  return (
    <button type="button" onClick={() => void share()} className="btn btn-ghost py-2">
      {state === "copied" || state === "shared" ? <Check size={12} aria-hidden /> : <Share2 size={12} aria-hidden />}
      {state === "shared" ? "Shared" : state === "copied" ? "Copied" : state === "failed" ? "Copy the URL" : label}
    </button>
  );
}
