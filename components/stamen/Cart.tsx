"use client";

// Saved compositions.
//
// This was the kit's bag: line items, quantities, subtotals, delivery and a
// checkout hand-off. Flora-Synth keeps none of that. What it keeps is the useful
// half — a shelf of the compositions you have sealed, each one reopenable, since
// a composition is entirely described by its URL.

import { useEffect } from "react";
import { Copy, X, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { paletteById, sizeById, wrapById } from "@/lib/stamen/catalog";
import { cart, useCart, type Line } from "@/lib/stamen/cart";
import { scrollToId } from "./Stage";

/** the share link that recreates a sealed composition */
function linkFor(l: Line) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("size", l.size);
  url.searchParams.set("c", l.palette);
  url.searchParams.set("w", l.wrap);
  url.searchParams.set("v", l.vase ? "vase" : "wrap");
  if (l.note) url.searchParams.set("note", l.note);
  return url.toString();
}

export default function Cart() {
  const { lines, open } = useCart();
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cart.setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const copy = async (l: Line) => {
    try {
      await navigator.clipboard.writeText(linkFor(l));
      setCopied(l.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.location.href = linkFor(l);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#2a0a1c]/50 transition-opacity duration-500"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        onClick={() => cart.setOpen(false)}
        aria-hidden
      />
      <aside
        className="stamen-card fixed bottom-0 right-0 top-0 z-[60] flex w-full max-w-[460px] flex-col shadow-2xl"
        style={{ transform: open ? "translateX(0)" : "translateX(105%)", transition: "transform .7s cubic-bezier(0.65, 0, 0.35, 1)" }}
        aria-label="Saved compositions"
        aria-hidden={!open}
        {...((!open ? { inert: "" } : {}) as Record<string, string>)}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
          <div>
            <p className="stamen-serif text-[34px]">Your compositions</p>
            <p className="stamen-mono mt-1 text-[11px] text-[var(--ink-soft)]">
              {lines.length} {lines.length === 1 ? "composition" : "compositions"}
            </p>
          </div>
          <button onClick={() => cart.setOpen(false)} className="rounded-full border border-[var(--line)] p-2.5" aria-label="Close the shelf">
            <X size={16} />
          </button>
        </div>

        <p className="border-b border-[var(--line)] px-6 py-4 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">
          Each one is a link, not a saved basket. Copy it and the exact bouquet reopens — same species, same angles, same colour — on any device.
        </p>

        <ul className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 && (
            <li className="py-16 text-center">
              <p className="stamen-serif text-[30px]">
                Nothing sealed <em>yet.</em>
              </p>
              <button
                className="mt-6 rounded-full bg-[#9e2b3e] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-white"
                onClick={() => {
                  cart.setOpen(false);
                  scrollToId("build");
                }}
              >
                Compose one
              </button>
            </li>
          )}
          {lines.map((l) => {
            const size = sizeById(l.size);
            const pal = paletteById(l.palette);
            return (
              <li key={l.id} className="flex gap-4 border-b border-[var(--line)] py-4">
                <Posy colors={pal.swatch} paper={wrapById(l.wrap).paper} />
                <div className="flex-1">
                  <p className="stamen-serif text-[22px]">
                    {size.name}, <em>{pal.name.toLowerCase()}</em>
                  </p>
                  <p className="stamen-mono mt-1 text-[11px] text-[var(--ink-soft)]">
                    {size.stems} stems · {l.vase ? "in the vase" : `${wrapById(l.wrap).name} wrap`}
                  </p>
                  {l.note && <p className="mt-1.5 text-[12.5px] italic text-[var(--ink-soft)]">“{l.note}”</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => copy(l)}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-[11.5px] font-medium"
                    >
                      {copied === l.id ? <Check size={13} /> : <Copy size={13} />}
                      {copied === l.id ? "Copied" : "Copy link"}
                    </button>
                    <button onClick={() => cart.remove(l.id)} className="p-2 text-[var(--ink-soft)] hover:text-[var(--ink)]" aria-label={`Remove the ${size.name} composition`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-[var(--line)] px-6 pb-6 pt-4">
          <p className="stamen-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            Nothing is stored on a server · the link is the recipe
          </p>
        </div>
      </aside>
    </>
  );
}

/** a tiny posy for the shelf: three blooms over a paper cone */
function Posy({ colors, paper }: { colors: string[]; paper: string }) {
  return (
    <svg viewBox="0 0 48 64" className="h-[72px] w-[54px] shrink-0" aria-hidden>
      <path d="M8 26 L24 62 L40 26 Z" fill={paper} />
      <circle cx="16" cy="20" r="9" fill={colors[0]} />
      <circle cx="31" cy="16" r="10" fill={colors[1]} />
      <circle cx="25" cy="27" r="8" fill={colors[2]} />
      <circle cx="31" cy="16" r="2.4" fill="#2a0a1c" opacity="0.6" />
    </svg>
  );
}
