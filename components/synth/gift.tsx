"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { BouquetCanvas } from "@/components/three/bouquet-scene";
import { AudioToggle } from "@/components/synth/audio-toggle";
import { decodeBouquet } from "@/lib/bouquet";
import type { GardenEntry } from "@/lib/garden";
import { getSpecimen } from "@/lib/hybrids";
import { useSynth } from "@/lib/store";

/**
 * The unboxing.
 *
 * A gift link opens sealed: the bouquet is not shown, only the recipient's name and the
 * fact that something is waiting. Untying it mounts the canvas for the first time, so the
 * Living Growth animation plays *for them*, as the reveal — the flower opens because they
 * arrived, not on a timer.
 */
export function GiftExperience({ entry }: { entry: GardenEntry }) {
  const applyConfig = useSynth((s) => s.applyConfig);
  const config = useSynth((s) => s.config);
  const theme = useSynth((s) => s.theme);
  const [opened, setOpened] = useState(false);
  const [mounted, setMounted] = useState(false);

  // the gift's composition is the page's composition
  useEffect(() => {
    applyConfig(decodeBouquet(entry.config));
    setMounted(true);
  }, [applyConfig, entry.config]);

  // count the visit once, silently
  useEffect(() => {
    const key = `flora-gift-${entry.code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode: still fine to count */
    }
    void fetch(`/api/garden/${entry.code}`, { method: "POST" }).catch(() => undefined);
  }, [entry.code]);

  const species = entry.species.map((slug) => getSpecimen(slug)).filter(Boolean);

  return (
    <section className="relative min-h-[100svh] bg-scene">
      {opened && mounted ? (
        <BouquetCanvas
          key={`${theme}-${entry.code}`}
          config={config}
          theme={theme}
          className="absolute inset-0 h-full w-full"
          label={`The sealed bouquet, ${entry.title ?? "a composition"}, drawn in 3D.`}
        />
      ) : null}

      {/* the seal */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center px-6"
        initial={false}
        animate={{ opacity: opened ? 0 : 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: opened ? "none" : "auto" }}
      >
        <div className="frost relative w-full max-w-[30rem] rounded-[1.75rem] p-8 text-center md:p-11">
          {/* gold frame, inset like the edge of a correspondence card */}
          <span aria-hidden className="pointer-events-none absolute inset-3 rounded-[1.35rem] border border-[color-mix(in_oklab,var(--gold)_38%,transparent)]" />

          <div className="relative">
            <p className="label text-[var(--gold-ink)]">Sealed correspondence · {entry.code}</p>

            {/* the wax seal */}
            <div className="mt-7 flex justify-center">
              <div className="seal candle h-20 w-20">
                <span className="font-display text-2xl italic leading-none">
                  {(entry.creator ?? entry.title).trim().charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <h1 className="mt-7 font-display text-[clamp(1.9rem,5vw,2.8rem)] leading-[1.02] tracking-[-0.015em] text-ink">
              {entry.title}
            </h1>

            <p className="mx-auto mt-4 max-w-[26rem] font-display text-[1.15rem] italic leading-relaxed text-ink-soft">
              {entry.message
                ? `“${entry.message}”`
                : "Someone composed this for you. It has been waiting here, unopened, ever since."}
            </p>

            <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
              {species.map((spec, i) => (
                <span
                  key={`${spec!.slug}-${i}`}
                  className="h-2 w-2 rounded-full ring-1 ring-[color-mix(in_oklab,var(--gold)_50%,transparent)]"
                  style={{
                    background: `linear-gradient(140deg, ${spec!.colours.petal[0]}, ${spec!.colours.petal[1]})`,
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setOpened(true)}
              className="btn btn-primary group mt-8 w-full"
            >
              <span className="transition-transform duration-500 group-hover:rotate-6">✦</span>
              Break the seal
            </button>

            <p className="mt-5 font-sans text-[0.55rem] uppercase tracking-[0.3em] text-ink-soft">
              {entry.creator ? `From ${entry.creator}` : "No signature"}
              {entry.views > 0 ? ` · opened ${entry.views} ${entry.views === 1 ? "time" : "times"}` : ""}
            </p>
          </div>
        </div>
      </motion.div>

      {/* the letter, once it is open */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 p-6 md:p-10"
        initial={false}
        animate={{ opacity: opened ? 1 : 0, y: opened ? 0 : 16 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-2xl italic leading-none text-ink">{entry.title}</p>
            <p className="mt-2 font-sans text-[0.55rem] uppercase tracking-[0.28em] text-ink-soft">
              {entry.species.length} species · {entry.density} stems · {entry.palette}
            </p>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <AudioToggle />
            <a
              href="/studio"
              className="btn btn-ghost py-2"
            >
              Make your own
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
