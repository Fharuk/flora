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
        <div className="w-full max-w-md rounded-sm border border-current/12 bg-[var(--glass)] p-8 text-center backdrop-blur-xl md:p-10">
          <p className="font-mono text-[0.58rem] tracking-[0.36em] opacity-45">GIFT · {entry.code}</p>
          <h1 className="mt-5 font-serif text-[clamp(1.7rem,4.6vw,2.5rem)] leading-[1.06] tracking-[-0.02em]">
            {entry.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed opacity-60">
            {entry.message
              ? `“${entry.message}”`
              : "Someone composed this for you. It has been waiting, unopened, ever since."}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
            {species.map((spec, i) => (
              <span
                key={`${spec!.slug}-${i}`}
                className="h-2 w-2 rounded-full ring-1 ring-current/20"
                style={{
                  background: `linear-gradient(140deg, ${spec!.colours.petal[0]}, ${spec!.colours.petal[1]})`,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOpened(true)}
            className="mt-8 w-full rounded-sm border border-current/25 py-3 font-mono text-[0.64rem] tracking-[0.28em] transition-colors hover:bg-current/5"
          >
            UNTIE THE RIBBON
          </button>
          <p className="mt-4 font-mono text-[0.55rem] tracking-[0.2em] opacity-30">
            {entry.creator ? `FROM ${entry.creator.toUpperCase()}` : "NO SIGNATURE"}
            {entry.views > 0 ? ` · OPENED ${entry.views} TIMES` : ""}
          </p>
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
            <p className="font-serif text-xl leading-none tracking-tight">{entry.title}</p>
            <p className="mt-2 font-mono text-[0.58rem] tracking-[0.2em] opacity-50">
              {entry.species.length} SPECIES · {entry.density} STEMS · {entry.palette.toUpperCase()}
            </p>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <AudioToggle />
            <a
              href="/studio"
              className="rounded-full border border-current/20 px-3 py-1.5 font-mono text-[0.58rem] tracking-[0.22em] transition-colors hover:bg-current/5"
            >
              MAKE YOUR OWN
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
