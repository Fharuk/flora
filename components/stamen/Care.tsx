"use client";

// Care, the Friday letter, and the footer: the end of the page, on the
// garnet field with loose petals falling through it.

import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { CARE } from "@/lib/stamen/catalog";
import { Mark } from "./Mark";
import { scrollToId } from "./Stage";

export function Care() {
  const [open, setOpen] = useState(0);
  return (
    <section id="care" data-scene="care" className="relative px-5 pb-24 pt-[18vh] md:px-[7vw]">
      <div className="mx-auto grid max-w-[1180px] gap-12 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow">Care</p>
          <p className="stamen-serif mt-4 text-[14vw] md:text-[5.2vw]">
            Keep them <em>happy.</em>
          </p>
          <p className="mt-5 max-w-[34ch] text-[16px] leading-snug text-[var(--ink-soft)]">Cool water, a sharp knife, somewhere you'll see them. The rest is up to the flowers.</p>
        </div>
        <ul className="border-t border-[var(--line)]">
          {CARE.map((c, i) => {
            const isOpen = open === i;
            return (
              <li key={c.q} className="border-b border-[var(--line)]">
                <button className="flex w-full items-center justify-between gap-4 py-5 text-left" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
                  <span className="stamen-serif text-[22px] md:text-[26px]">{c.q}</span>
                  <ChevronDown size={18} className="shrink-0 transition-transform duration-300" style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
                </button>
                <div className="grid transition-[grid-template-rows] duration-500" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                  <p className="overflow-hidden pb-0 text-[15.5px] leading-relaxed text-[var(--ink-soft)]" style={{ paddingBottom: isOpen ? 22 : 0 }}>
                    {c.a}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative px-5 pb-10 pt-16 md:px-[7vw]">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-10 border-t border-[var(--line)] pt-14 md:grid-cols-2">
          <div>
            <p className="stamen-serif text-[12vw] md:text-[4.4vw]">
              The <em>practice.</em>
            </p>
            <p className="mt-4 max-w-[36ch] text-[15.5px] leading-snug text-[var(--ink-soft)]">How the ten are built, how they are lit, and what to do when a petal geometry is not behaving. Notes from the bench.</p>
          </div>
          <div className="md:pt-3">
            <p className="max-w-[42ch] text-[15.5px] leading-snug text-[var(--ink-soft)]">
              There is no list to join and nothing to buy. This is a studio of ten flowers, made in a browser; take the link at
              the end of the page and it carries the whole composition with it.
            </p>
            <button
              onClick={() => scrollToId("build")}
              className="mt-6 flex items-center gap-2 rounded-full bg-[#fbf4ec] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7d1f2f]"
            >
              Compose one <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div className="mt-20 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Mark className="h-12 w-12 text-[#fff4f1]" />
            <span className="stamen-wordmark text-[30px] md:text-[40px]">FLORA-SYNTH</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[var(--ink-soft)]" aria-label="Footer">
            {[
              ["The film", "bloom"],
              ["Up close", "closer"],
              ["The stems", "stems"],
              ["Build a bouquet", "build"],
              ["Care", "care"],
            ].map(([label, id]) => (
              <button key={id} onClick={() => scrollToId(id)} className="hover:text-[var(--ink)]">
                {label}
              </button>
            ))}
          </nav>
        </div>
        <p className="stamen-mono mt-10 text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">© 2026 Flora-Synth. Every petal drawn from numbers.</p>
      </div>
    </footer>
  );
}
