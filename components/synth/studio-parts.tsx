"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { useBouquetMeta, useShareUrl, useSynth } from "@/lib/store";

/** Title + seed readout, sized for an overlay on the canvas. */
export function BouquetTitle() {
  const { title } = useBouquetMeta();
  return (
    <div className="rounded-sm bg-[var(--glass)] px-3 py-2 backdrop-blur-md">
      <p className="font-serif text-base leading-none tracking-tight">{title}</p>
      <p className="mt-1 font-mono text-[0.55rem] tracking-[0.22em] opacity-50">IN PROGRESS</p>
    </div>
  );
}

export function SeedReadout() {
  const config = useSynth((s) => s.config);
  const generation = useSynth((s) => s.generation);
  return (
    <div className="rounded-sm bg-[var(--glass)] px-3 py-2 text-right backdrop-blur-md">
      <p className="font-mono text-[0.58rem] tracking-[0.2em] opacity-70">
        SEED {config.seed.toString(36).toUpperCase()}
      </p>
      <p className="mt-1 font-mono text-[0.55rem] tracking-[0.2em] opacity-40">
        GEN {String(generation).padStart(3, "0")}
      </p>
    </div>
  );
}

export function CopyShare({ label = "COPY LINK" }: { label?: string }) {
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
      className="inline-flex items-center gap-2 rounded-full border border-current/20 px-3 py-1.5 font-mono text-[0.58rem] tracking-[0.22em] transition-colors hover:bg-current/5"
    >
      {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
      {copied ? "COPIED" : label}
    </button>
  );
}
