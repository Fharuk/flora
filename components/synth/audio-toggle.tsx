"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FloraAudio, type AudioConfig } from "@/lib/audio";
import { getSpecimen } from "@/lib/hybrids";
import { useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * "Listen" — starts the generative score for the current bouquet.
 *
 * Kept deliberately quiet in the interface: one small control, no autoplay, no prompt. The
 * audio engine is created lazily on the first click and torn down when the component
 * unmounts, so a visitor who never presses it pays nothing.
 */
export function AudioToggle({ className }: { className?: string }) {
  const config = useSynth((s) => s.config);
  const engine = useRef<FloraAudio | null>(null);
  const [on, setOn] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const audioConfig = useMemo<AudioConfig>(() => {
    const species = config.species
      .map((slug) => getSpecimen(slug))
      .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec))
      .map((spec) => ({
        slug: spec.slug,
        finish: spec.finish,
        weight: spec.weight,
      }));
    return {
      seed: config.seed,
      species,
      density: config.density,
      bloom: config.bloom,
      arrangement: config.arrangement,
    };
  }, [config]);

  useEffect(() => {
    if (on && engine.current) engine.current.update(audioConfig);
  }, [audioConfig, on]);

  useEffect(() => () => engine.current?.dispose(), []);

  const toggle = useCallback(async () => {
    if (on) {
      engine.current?.stop();
      setOn(false);
      return;
    }
    if (typeof window === "undefined") return;
    if (!engine.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        setUnsupported(true);
        return;
      }
      engine.current = new FloraAudio();
    }
    await engine.current.start(audioConfig);
    setOn(true);
  }, [audioConfig, on]);

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={on}
      title={on ? "Silence the bouquet" : "Hear the bouquet"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-current/20 px-3 py-1.5 font-mono text-[0.58rem] tracking-[0.22em] uppercase transition-colors hover:bg-current/5",
        on && "bg-current/10",
        className
      )}
    >
      {on ? <Volume2 size={12} aria-hidden /> : <VolumeX size={12} aria-hidden />}
      {unsupported ? "NO AUDIO" : on ? "Listening" : "Listen"}
      {on ? (
        <span className="flex items-end gap-[2px]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[2px] animate-pulse rounded-full bg-[var(--accent)]"
              style={{ height: 4 + i * 3, animationDelay: `${i * 140}ms` }}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
}
