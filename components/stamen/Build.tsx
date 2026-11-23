"use client";

// Build a composition: the panel beside the live bouquet. Every pick goes to
// the shared `pick`, which the 3D bouquet follows — the scale and colour story
// rebuild it, the wrap recolours it, the vessel stands it up.
//
// The kit's version of this panel was an order form. This one composes a
// specimen mount instead: no prices, no delivery plans, no bag button. The
// scale now also changes which species are in the vase, so switching it is a
// visible change rather than a number going up.

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { PALETTES, SIZES, WRAPS } from "@/lib/stamen/catalog";
import { cart, stemCount, useCart } from "@/lib/stamen/cart";
import { Beat } from "./Chapters";

const opt = "rounded-[14px] border px-3 py-2.5 text-left transition-colors";
const on = "border-[var(--ink)] bg-[var(--chip)]";
const off = "border-[var(--line)] hover:border-[var(--ink-faint)]";

export default function Build() {
  const { pick } = useCart();
  const [sealed, setSealed] = useState(false);
  const stems = stemCount(pick);

  const seal = async () => {
    // the composition lives in the URL, so "seal" copies the link that recreates it
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("size", pick.size);
    url.searchParams.set("c", pick.palette);
    url.searchParams.set("w", pick.wrap);
    url.searchParams.set("v", pick.vase ? "vase" : "wrap");
    if (pick.note.trim()) url.searchParams.set("note", pick.note.trim().slice(0, 140));
    try {
      await navigator.clipboard.writeText(url.toString());
      setSealed(true);
      setTimeout(() => setSealed(false), 2400);
    } catch {
      window.location.href = url.toString();
    }
  };

  return (
    <section id="build" data-scene="build" className="relative h-[200vh]">
      <h2 className="sr-only">Compose a specimen mount</h2>
      <div className="sticky-stage">
        {/*
         * The panel is a beat like any other copy block, so it fades in and —
         * crucially — out. Without the `data-beat` wrapper it stayed pinned over
         * the care chapter, which turns the composer off in the 3D scene but had
         * no way to remove the form.
         */}
        <Beat a="0.04" b="0.86" className="absolute inset-0">
        <div className="absolute inset-x-3 bottom-3 top-[46vh] flex md:inset-x-auto md:bottom-auto md:right-[4vw] md:top-[50%] md:w-[440px] md:-translate-y-1/2 lg:right-[6vw]">
          <div className="stamen-card pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-[28px] shadow-[0_30px_80px_-30px_rgba(42,10,28,0.45)] md:max-h-[86vh]">
            <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] px-6 pb-4 pt-5">
              <div>
                <p className="eyebrow">Composition</p>
                <p className="stamen-serif mt-2 text-[30px] md:text-[34px]">
                  Yours, <em>in glass.</em>
                </p>
              </div>
              <p className="stamen-mono shrink-0 pb-1 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{stems} stems</p>
            </div>

            <div className="stamen-noscroll flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <Group label="Scale">
                <div className="grid grid-cols-3 gap-2">
                  {SIZES.map((s) => (
                    <button key={s.id} onClick={() => cart.pick({ size: s.id })} className={`${opt} ${pick.size === s.id ? on : off}`} aria-pressed={pick.size === s.id}>
                      <span className="stamen-serif block text-[20px]">{s.name}</span>
                      <span className="stamen-mono block text-[10.5px] text-[var(--ink-soft)]">
                        {s.stems} stems · {s.note}
                      </span>
                    </button>
                  ))}
                </div>
              </Group>

              <Group label="Colour story" hint={PALETTES.find((p) => p.id === pick.palette)?.note}>
                <div className="grid grid-cols-4 gap-2">
                  {PALETTES.map((p) => (
                    <button key={p.id} onClick={() => cart.pick({ palette: p.id })} className={`${opt} flex flex-col items-center gap-2 ${pick.palette === p.id ? on : off}`} aria-pressed={pick.palette === p.id}>
                      <span className="flex -space-x-1.5">
                        {p.swatch.map((c, i) => (
                          <span key={i} className="h-5 w-5 rounded-full ring-2 ring-[#fff6f4]" style={{ background: c }} />
                        ))}
                      </span>
                      <span className="text-[12.5px] font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              </Group>

              <Group label={pick.vase ? "Vessel" : "Wrap"}>
                <div className="flex flex-wrap gap-2">
                  {WRAPS.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => cart.pick({ wrap: w.id, vase: false })}
                      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] ${!pick.vase && pick.wrap === w.id ? on : off}`}
                      aria-pressed={!pick.vase && pick.wrap === w.id}
                    >
                      <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: w.paper }} />
                      {w.name}
                    </button>
                  ))}
                  <button
                    onClick={() => cart.pick({ vase: !pick.vase })}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] ${pick.vase ? on : off}`}
                    aria-pressed={pick.vase}
                  >
                    <span className="h-4 w-3 rounded-b-[6px] rounded-t-[3px] bg-[#ece3da] ring-1 ring-black/15" />
                    Stoneware vase
                  </button>
                </div>
              </Group>

              <Group label="The card" hint={`${140 - pick.note.length} left`}>
                <textarea
                  value={pick.note}
                  maxLength={140}
                  rows={2}
                  onChange={(e) => cart.pick({ note: e.target.value })}
                  placeholder="Write something. It travels with the link."
                  className="w-full resize-none rounded-[14px] border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)]"
                />
              </Group>
            </div>

            <div className="border-t border-[var(--line)] px-6 pb-5 pt-4">
              <button
                onClick={() => {
                  cart.add();
                  void seal();
                }}
                className="flex w-full items-center justify-between rounded-full bg-[#9e2b3e] px-6 py-4 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#7d1f2f]"
              >
                <span className="flex items-center gap-2">
                  {sealed ? <Check size={16} /> : <Link2 size={16} />}
                  {sealed ? "Link copied" : "Seal & copy link"}
                </span>
                <span className="stamen-mono">{pick.size}</span>
              </button>
              <p className="stamen-mono mt-3 text-center text-[10.5px] text-[var(--ink-soft)]">
                Every stem is drawn in the browser · the link is the whole recipe
              </p>
            </div>
          </div>
        </div>
        </Beat>
      </div>
    </section>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="stamen-mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">{label}</p>
        {hint && <p className="text-[12px] italic text-[var(--ink-soft)]">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
