"use client";

import { Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { breedHybrid, getSpecimen, hybridSlug } from "@/lib/hybrids";
import { rarityLabel, rarityBySlug, specimens, type Rarity } from "@/lib/specimens";
import { useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

const TONE: Record<Rarity, string> = {
  common: "border-current/20 opacity-60",
  rare: "border-[#7b8b4e]/45 text-[#5e6b3a]",
  exotic: "border-[#c08a2e]/50 text-[#9a6b18]",
  legendary: "border-[#a855f7]/50 text-[#8b3fd4]",
  mythic: "border-current/60",
};

/** The collectibility tier, shown beside the botanical record rather than instead of it. */
export function RarityChip({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-[0.15rem] font-mono text-[0.5rem] uppercase tracking-[0.2em] dark:border-current/30",
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
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.34em] text-ink-soft">
            03 — The crossing
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.02] tracking-[-0.02em]">
            Two specimens.
            <br />
            One that has never existed.
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
                  className="mt-1.5 w-full appearance-none rounded-md border border-line bg-transparent px-3 py-2.5 font-display text-base outline-none focus:border-[var(--line-strong)]"
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
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.22em] transition-colors hover:bg-ink/5"
          >
            <Shuffle size={12} aria-hidden />
            Cross again
          </button>
        </div>

        {/* the child */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-[var(--glass)] p-7 backdrop-blur-md md:p-9">
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

              <h3 className="mt-5 font-display text-[clamp(1.7rem,3.4vw,2.4rem)] leading-[1.04] tracking-[-0.015em]">
                {hybrid.name}
              </h3>
              <p className="mt-1 font-display text-sm italic text-ink-soft">{hybrid.latin}</p>

              <p className="mt-5 text-sm leading-relaxed text-ink-soft">{hybrid.blurb}</p>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-ink-soft">
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
                  className="rounded-full bg-ink px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-paper transition-opacity hover:opacity-85"
                >
                  {added ? "In the vase" : "Put it in the vase"}
                </button>
                <button
                  type="button"
                  onClick={cross}
                  className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft underline-offset-4 hover:underline"
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
