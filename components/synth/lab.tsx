"use client";

import { Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { breedHybrid, getSpecimen, hybridSlug } from "@/lib/hybrids";
import { rarityLabel, rarityBySlug, specimens, type Rarity } from "@/lib/specimens";
import { useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

const TONE: Record<Rarity, string> = {
  common: "border-[color-mix(in_oklab,var(--ink)_22%,transparent)] text-ink-soft",
  rare: "border-[color-mix(in_oklab,var(--gold)_55%,transparent)] text-[var(--gold-ink)]",
  exotic: "border-[color-mix(in_oklab,#c98a3a_60%,transparent)] text-[#8a5a1c] dark:text-[#e0b07a]",
  legendary: "border-[color-mix(in_oklab,var(--accent)_60%,transparent)] text-[var(--accent)]",
  mythic: "border-[var(--accent)] text-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]",
};

/** The collectibility tier, shown beside the botanical record rather than instead of it. */
export function RarityChip({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-[0.15rem] font-sans text-[0.46rem] uppercase tracking-[0.22em]",
        TONE[rarity],
        className
      )}
    >
      {rarity === "mythic" || rarity === "legendary" ? (
        <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
      ) : null}
      {rarityLabel[rarity]}
    </span>
  );
}

/**
 * The breeding lab.
 *
 * Cross two specimens and a third appears: blended petals, one parent's body plan, the
 * other's surface, a binomial name, and a rarity computed from how far the child drifted.
 * Every cross is reproducible from its own slug, so a hybrid can go straight into a bouquet
 * link — the vase can hold a flower that exists nowhere else.
 */
export function HybridLab() {
  const config = useSynth((s) => s.config);
  const setSpecies = useSynth((s) => s.setSpecies);
  const [a, setA] = useState(specimens[0].slug);
  const [b, setB] = useState(specimens[1].slug);
  const [seed, setSeed] = useState(1);
  const [added, setAdded] = useState(false);

  // start from whatever the vase currently holds, so the lab answers a question the
  // visitor has already asked
  useEffect(() => {
    const [first, second] = config.species.filter((slug) => getSpecimen(slug));
    if (first) setA(first);
    if (second && second !== first) setB(second);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hybrid = useMemo(() => {
    const pa = getSpecimen(a);
    const pb = getSpecimen(b);
    if (!pa || !pb) return null;
    return breedHybrid(pa, pb, seed);
  }, [a, b, seed]);

  const cross = () => setSeed((s) => (s * 48271 + 11) % 2147483647);

  const putInVase = () => {
    if (!hybrid) return;
    const slug = hybridSlug(
      hybrid.parents[0],
      hybrid.parents[1],
      seed
    );
    setSpecies([...config.species, slug].slice(-5));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <section id="lab" className="relative border-t border-line px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
        <div>
          <p className="eyebrow">
            03 — The crossing
          </p>
          <h2 className="mt-5 text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.02] tracking-[-0.02em]">
            Two specimens.
            <br />
            One that has never <span className="emphasis">existed.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
            A hybrid inherits one parent&apos;s architecture and the other&apos;s surface, then
            drifts. Its name and its recipe are derived from the two parents and a seed, which
            means the flower you cross here can live inside a share link — no account, no
            upload, nothing stored.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              { label: "First parent", value: a, onChange: setA },
              { label: "Second parent", value: b, onChange: setB },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-ink-soft">
                  {field.label}
                </span>
                <select
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="mt-1.5 w-full appearance-none rounded-lg border border-[color-mix(in_oklab,var(--gold)_32%,transparent)] bg-transparent px-3 py-2.5 font-display text-[1.05rem] outline-none focus:border-[var(--gold)]"
                >
                  {specimens.map((s) => (
                    <option key={s.slug} value={s.slug} className="bg-paper text-ink">
                      {s.name} — {s.latin}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={cross}
            className="btn btn-ghost mt-4"
          >
            <Shuffle size={12} aria-hidden />
            Cross again
          </button>
        </div>

        {/* the child */}
        <div className="frost relative overflow-hidden rounded-[1.6rem] p-7 md:p-10">
          <span aria-hidden className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-[color-mix(in_oklab,var(--gold)_26%,transparent)]" />
          {hybrid ? (
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
              style={{
                background: `radial-gradient(circle, ${hybrid.colours.petal[0]}, transparent 70%)`,
              }}
              aria-hidden
            />
          ) : null}

          {hybrid ? (
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.26em] text-ink-soft">
                  {hybrid.parents
                    .map((slug) => getSpecimen(slug)?.name ?? slug)
                    .join("  ×  ")}
                </p>
                <RarityChip rarity={hybrid.rarity} />
              </div>

              <h3 className="mt-5 font-display text-[clamp(1.8rem,3.6vw,2.6rem)] leading-[1.02] tracking-[-0.015em] text-ink">
                {hybrid.name}
              </h3>
              <p className="mt-1 font-display text-sm italic text-ink-soft">{hybrid.latin}</p>

              <p className="mt-5 text-sm leading-relaxed text-ink-soft">{hybrid.blurb}</p>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[color-mix(in_oklab,var(--gold)_28%,transparent)] pt-5 font-sans text-[0.52rem] uppercase tracking-[0.2em] text-ink-soft">
                <div>
                  <dt className="opacity-70">Form</dt>
                  <dd className="mt-1 text-ink">{hybrid.form}</dd>
                </div>
                <div>
                  <dt className="opacity-70">Finish</dt>
                  <dd className="mt-1 text-ink">{hybrid.finish}</dd>
                </div>
                <div>
                  <dt className="opacity-70">Divergence</dt>
                  <dd className="mt-1 text-ink">{Math.round(hybrid.divergence * 100)}%</dd>
                </div>
                <div>
                  <dt className="opacity-70">Recipe</dt>
                  <dd className="mt-1 truncate text-ink">{hybridSlug(hybrid.parents[0], hybrid.parents[1], seed)}</dd>
                </div>
              </dl>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={putInVase}
                  className="btn btn-primary"
                >
                  {added ? "In the vase" : "Put it in the vase"}
                </button>
                <button
                  type="button"
                  onClick={cross}
                  className="font-sans text-[0.55rem] uppercase tracking-[0.24em] text-[var(--gold-ink)] underline-offset-4 hover:underline"
                >
                  Same parents, new seed
                </button>
              </div>
            </div>
          ) : (
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ink-soft">
              Pick two different parents.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export { rarityBySlug };
