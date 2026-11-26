"use client";

import { useCallback, useSyncExternalStore, useState } from "react";
import { Layers, Menu, Sun, X } from "lucide-react";
import { cart, totals, useCart } from "@/lib/stamen/cart";
import { PRESETS, presetStore, type LightingPreset } from "@/lib/stamen/preset";
import { scrollToId } from "./Stage";
import { Mark } from "./Mark";

/**
 * The light switch.
 *
 * One cycle button rather than a menu of three: the film is played, not
 * configured, and a viewer who wants a different light should be able to get one
 * without opening anything. It says the preset it is on, and cycles through them
 * in the order they depart from the film's design.
 */
function LightSwitch() {
  const [open, setOpen] = useState(false);
  const preset = useSyncExternalStore(presetStore.subscribe, presetStore.get, presetStore.get);
  const current = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];

  const choose = useCallback((next: LightingPreset) => {
    setOpen(false);
    /*
     * The director reads its preset once, at build time: changing it mid-film
     * would mean rebuilding the room. A reload is honest about that and cheap —
     * the film is scroll-positioned, and the preset is in the URL so the page
     * opens at the top of the same light.
     */
    presetStore.set(next);
    const url = new URL(window.location.href);
    if (next === "daylight") url.searchParams.delete("light");
    else url.searchParams.set("light", next);
    window.location.replace(url.toString());
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="stamen-glass flex items-center gap-2 rounded-full px-3 py-2.5 text-[13px] font-medium"
        aria-label={`Light: ${current.name}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Sun size={16} />
        <span className="hidden sm:inline">{current.name}</span>
      </button>
      {open ? (
        <div className="stamen-glass absolute right-0 top-full mt-2 w-[15rem] overflow-hidden rounded-2xl p-1.5">
          <ul className="text-left">
            {PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => choose(p.id)}
                  aria-pressed={p.id === preset}
                  className="block w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--chip)]"
                >
                  <span className="block text-[13px] font-medium">{p.name}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug opacity-60">{p.note}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const LINKS = [
  { id: "bloom", label: "The film" },
  { id: "closer", label: "Up close" },
  { id: "stems", label: "The stems" },
  { id: "build", label: "Compose" },
  { id: "care", label: "Care" },
];

export default function Nav() {
  const { lines } = useCart();
  const count = totals(lines).count;
  const [open, setOpen] = useState(false);
  const go = (id: string) => {
    setOpen(false);
    scrollToId(id);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-4 md:px-8 md:py-5">
        <button onClick={() => go("bloom")} className="flex items-center gap-2.5" aria-label="Flora-Synth, back to the top">
          <Mark className="h-7 w-7 text-[#9e2b3e]" />
          <span className="stamen-wordmark text-[17px] md:text-[18px]">FLORA-SYNTH</span>
        </button>
        <nav className="stamen-glass hidden items-center gap-1 rounded-full p-1 md:flex" aria-label="Sections">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} className="rounded-full px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--chip)]">
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LightSwitch />
          <button onClick={() => cart.setOpen(true)} className="stamen-glass flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-medium" aria-label={`Saved compositions, ${count}`}>
            <Layers size={16} />
            <span className="stamen-mono tabular-nums">{count}</span>
          </button>
          <button onClick={() => go("build")} className="hidden rounded-full bg-[#9e2b3e] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#7d1f2f] sm:block">
            Compose
          </button>
          <button onClick={() => setOpen(true)} className="stamen-glass rounded-full p-2.5 md:hidden" aria-label="Menu">
            <Menu size={17} />
          </button>
        </div>
      </header>

      {/* the phone's menu */}
      <div
        className="fixed inset-0 z-[55] flex flex-col bg-[#2a0a1c] px-6 py-5 text-[#fff4f1] transition-[clip-path] duration-700"
        style={{ clipPath: open ? "inset(0 0 0 0)" : "inset(0 0 100% 0)" }}
        aria-hidden={!open}
        {...((!open ? { inert: "" } : {}) as Record<string, string>)}
      >
        <div className="flex items-center justify-between">
          <span className="stamen-wordmark text-[17px]">FLORA-SYNTH</span>
          <button onClick={() => setOpen(false)} className="rounded-full border border-white/20 p-2.5" aria-label="Close the menu">
            <X size={17} />
          </button>
        </div>
        <ul className="mt-14 space-y-2">
          {LINKS.map((l, i) => (
            <li key={l.id}>
              <button onClick={() => go(l.id)} className="stamen-serif flex items-baseline gap-4 text-[50px]">
                <span className="stamen-mono text-[11px] text-white/50">0{i + 1}</span>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => go("build")} className="mt-auto rounded-full bg-[#9e2b3e] py-4 text-[12px] font-semibold uppercase tracking-[0.16em]">
          Compose
        </button>
      </div>
    </>
  );
}
