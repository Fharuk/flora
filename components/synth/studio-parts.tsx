"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

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

export function CopyShare({ label = "Copy link" }: { label?: string }) {
  const url = useShareUrl();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="btn btn-ghost py-2"
    >
      {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}
