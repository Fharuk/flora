"use client";

import { useEffect, useState } from "react";
import { useLive } from "./useLive";
import { Mark } from "./Mark";

/** The curtain: a film being developed. The mark fills as the scene builds, then the curtain lifts. */
export default function Loader() {
  const load = useLive("load");
  const ready = useLive("ready");
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), 1500);
    return () => clearTimeout(t);
  }, [ready]);

  if (gone) return null;
  const fill = Math.round(Math.min(1, load) * 100);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#2a1430] text-[#fff4f1]"
      style={{ clipPath: ready ? "inset(0 0 100% 0)" : "inset(0 0 0 0)", transition: "clip-path 1.2s cubic-bezier(0.7, 0, 0.3, 1) 0.25s" }}
      aria-hidden={ready}
      role="status"
    >
      <div className="relative h-16 w-16" style={{ ["--mark-center" as string]: "#2a1430" }}>
        <Mark className="absolute inset-0 h-16 w-16 text-white/10" />
        <div className="absolute inset-0" style={{ clipPath: `inset(${100 - fill}% 0 0 0)`, transition: "clip-path 0.5s cubic-bezier(0.65, 0, 0.35, 1)" }}>
          <Mark className="h-16 w-16 text-[#9e2b3e]" />
        </div>
      </div>
      <p className="stamen-wordmark mt-7 text-[22px]">FLORA-SYNTH</p>
      <p className="stamen-mono mt-4 text-[11px] uppercase tracking-[0.3em] text-white/60">
        Developing <span className="tabular-nums">{String(fill).padStart(3, "0")}</span>
      </p>
    </div>
  );
}
