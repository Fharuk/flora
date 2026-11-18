"use client";

import { useCallback, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { synthSite } from "@/lib/site";
import { useBouquetMeta, useShareUrl, useSynth } from "@/lib/store";
import { specimens } from "@/lib/specimens";

const notes = [
  {
    k: "01",
    title: "Nothing here is a photograph",
    body: "Every petal is a parametric surface generated at runtime from six numbers: length, width, cup, curl, twist and opening. Change the seed and the same species ruffles differently.",
  },
  {
    k: "02",
    title: "Glass is a physical material",
    body: "Transmission, thickness, dispersion and attenuation — not opacity. The refraction samples the actual stems behind each petal, which is why the bouquet changes colour as you orbit it.",
  },
  {
    k: "03",
    title: "Composition is a pure function",
    body: "Seed → stems → transforms, deterministically. The bouquet is encoded into the URL, so a link is the complete recipe. Nothing is stored, nothing is uploaded, nothing expires.",
  },
  {
    k: "04",
    title: "Built to hold sixty frames",
    body: "One merged geometry per species, shared materials, a single environment map baked in-browser, and a post stack that degrades to a cheaper path on small screens.",
  },
];

export function Notes() {
  const config = useSynth((s) => s.config);
  const shareUrl = useShareUrl();
  const { title } = useBouquetMeta();
  const seed = useSynth((s) => s.setSeed);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  return (
    <section id="notes" className="relative border-t border-line px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto w-full max-w-[92rem]">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <p className="eyebrow mb-4">05 — Notes from the bench</p>
            <h2 className="display max-w-sm text-[clamp(2rem,4vw,3.2rem)]">
              The method behind the <span className="emphasis">material.</span>
            </h2>
            <p className="mt-5 max-w-xs text-[0.88rem] leading-relaxed text-ink-soft">
              Four decisions that make the difference between a pretty render and an instrument
              you can keep using.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {notes.map((n) => (
                <div key={n.k} className="pt-4">
                  <div className="rule-gold mb-4" />
                  <dt className="flex items-baseline gap-3">
                    <span className="font-display text-[0.95rem] italic text-[var(--gold-ink)]">{n.k}</span>
                    <span className="font-display text-[1.35rem] leading-tight text-ink">{n.title}</span>
                  </dt>
                  <dd className="mt-2.5 text-[0.86rem] leading-relaxed text-ink-soft">{n.body}</dd>
                </div>
              ))}
            </dl>

            {/* the shareable artefact */}
            <div className="frost mt-10 rounded-[1.4rem] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="label mb-2">Your composition</p>
                  <p className="font-display text-[1.8rem] italic leading-tight text-ink">{title}</p>
                  <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-ink-soft">
                    {config.species.length} species · {config.density} stems · {config.arrangement} ·{" "}
                    {config.palette}
                  </p>
                </div>
                <button type="button" onClick={copy} className="btn btn-primary shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                  {copied ? "Link copied" : "Copy link"}
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-[color-mix(in_oklab,var(--gold)_24%,transparent)] bg-[color-mix(in_oklab,var(--blush)_35%,transparent)] px-4 py-3">
                <code className="whitespace-nowrap font-mono text-[0.62rem] text-ink-soft">
                  {shareUrl.replace(/^https?:\/\//, "")}
                </code>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="label">Seed</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => seed(Math.max(1, config.seed - 1))}
                    className="grid h-7 w-7 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] text-xs transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"
                    aria-label="Previous seed"
                  >
                    −
                  </button>
                  <span className="min-w-[4.5rem] text-center font-mono text-[0.72rem]">
                    {config.seed.toString(36).toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => seed(config.seed + 1)}
                    className="grid h-7 w-7 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] text-xs transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"
                    aria-label="Next seed"
                  >
                    +
                  </button>
                </div>
                <span className="label ml-auto">{specimens.length} species available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SynthFooter() {
  return (
    <footer className="relative border-t border-line px-5 pb-10 pt-16 sm:px-8">
      <div className="mx-auto w-full max-w-[92rem]">
        <div className="flex flex-wrap items-end justify-between gap-8 pb-8">
          <div>
            <p className="font-display text-[clamp(2.6rem,9vw,7rem)] leading-[0.82] tracking-[-0.03em]">
              Flora<span className="italic text-[var(--accent)]">-</span>Synth
            </p>
            <p className="mt-4 max-w-sm font-display text-[1.05rem] italic leading-relaxed text-ink-soft">
              Every bouquet is grown from a number, sealed with a link, and given away.
            </p>
          </div>
          <div className="space-y-1.5 text-right">
            <p className="label">{synthSite.location}</p>
            <p className="label">Est. {synthSite.year}</p>
            <a
              href={`mailto:${synthSite.email}`}
              className="block font-sans text-[0.62rem] uppercase tracking-[0.24em] text-ink transition-colors hover:text-[var(--gold-ink)]"
            >
              {synthSite.email}
            </a>
          </div>
        </div>
        <div className="rule-gold" />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="label">© {new Date().getFullYear()} Flora-Synth — composed, never stored</p>
          <p className="label">WebGL · three.js · procedural botany</p>
        </div>
      </div>
    </footer>
  );
}
