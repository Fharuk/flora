import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Header } from "@/components/synth/header";
import { SynthFooter } from "@/components/synth/notes";
import { ComposeWith, SpecimenRecord, SpecimenStand } from "@/components/synth/specimen-page";
import { rarityLabel, specimenRarity, specimens } from "@/lib/specimens";
import { synthSite } from "@/lib/site";

/**
 * One specimen, one page.
 *
 * The vitrine on /compose can show ten plants and only ever one at a time: it is
 * an argument about a collection. This page is the other thing a collection needs
 * — a place to send someone about a single plant. Each of the ten is statically
 * generated at build time, which is also what makes the per-specimen share card
 * worth having.
 */

export function generateStaticParams() {
  return specimens.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

function find(slug: string) {
  return specimens.find((s) => s.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const spec = find(slug);
  if (!spec) return { title: "Not found" };

  const title = `${spec.name} — ${spec.latin}`;
  const description = `${spec.blurb} ${spec.note}`;
  return {
    title,
    description,
    alternates: { canonical: `/specimen/${spec.slug}` },
    openGraph: {
      title,
      description: spec.blurb,
      images: [`/specimen/${spec.slug}/opengraph-image`],
    },
    twitter: { card: "summary_large_image", title, description: spec.blurb },
  };
}

export default async function SpecimenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spec = find(slug);
  if (!spec) notFound();

  const rarity = specimenRarity(spec.slug);
  const index = specimens.findIndex((s) => s.slug === spec.slug);
  const prev = specimens[(index - 1 + specimens.length) % specimens.length];
  const next = specimens[(index + 1) % specimens.length];

  /* the botanical record is the reason the page exists; the render is the hook */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: spec.name,
    alternativeName: spec.latin,
    description: spec.blurb,
    artform: "Procedural 3D",
    artMedium: `Rendered in ${spec.finish}`,
    creator: { "@type": "Organization", name: synthSite.name, url: synthSite.url },
    url: `${synthSite.url}/specimen/${spec.slug}`,
    keywords: [spec.family, spec.origin, spec.form, spec.finish, rarityLabel[rarity]].join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main id="main" className="mx-auto w-full max-w-[86rem] px-5 pb-24 pt-28 sm:px-8 sm:pt-36">
        <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-ink-soft">
          <Link href="/compose#specimens" className="transition-colors hover:text-ink">
            The ten
          </Link>
          <span aria-hidden>·</span>
          <span>
            no. {String(index + 1).padStart(2, "0")} of {String(specimens.length).padStart(2, "0")}
          </span>
          <span aria-hidden>·</span>
          <span className="text-[var(--gold-ink)]">{rarityLabel[rarity]}</span>
        </div>

        <div className="grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="order-2 lg:order-1">
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.26em] text-ink-soft">{spec.family}</p>
            <h1 className="mt-3 font-display text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.9] tracking-[-0.02em] text-ink">
              {spec.name}
            </h1>
            <p className="mt-3 font-display text-[1.35rem] italic text-ink-soft">{spec.latin}</p>

            <p className="mt-7 max-w-[46ch] text-[0.95rem] leading-[1.8] text-ink-soft">{spec.blurb}</p>
            <p className="mt-4 max-w-[46ch] font-display text-[1.15rem] italic leading-relaxed text-ink">
              {spec.note}
            </p>

            <SpecimenRecord specimen={spec} rarity={rarity} />

            <div className="mt-7">
              <ComposeWith slug={spec.slug} name={spec.name} />
            </div>

            <nav
              aria-label="Other specimens"
              className="mt-14 flex items-stretch justify-between gap-4 border-t border-line pt-6"
            >
              <Link href={`/specimen/${prev.slug}`} className="group max-w-[45%]">
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.24em] text-ink-soft">Previous</span>
                <span className="mt-1 block font-display text-[1.1rem] leading-tight text-ink transition-colors group-hover:text-[var(--gold-ink)]">
                  {prev.name}
                </span>
              </Link>
              <Link href={`/specimen/${next.slug}`} className="group max-w-[45%] text-right">
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.24em] text-ink-soft">Next</span>
                <span className="mt-1 block font-display text-[1.1rem] leading-tight text-ink transition-colors group-hover:text-[var(--gold-ink)]">
                  {next.name}
                </span>
              </Link>
            </nav>
          </div>

          <div className="order-1 lg:order-2">
            <SpecimenStand specimen={spec} />
            <p className="mt-3 font-mono text-[0.5rem] uppercase tracking-[0.22em] text-ink-soft">
              {spec.form} · {spec.finish} · {spec.origin}
            </p>
          </div>
        </div>

        {/* the rest of the ten, so a specimen page is a door rather than a cul-de-sac */}
        <section aria-labelledby="also" className="mt-24 border-t border-line pt-8">
          <h2 id="also" className="font-mono text-[0.55rem] uppercase tracking-[0.26em] text-ink-soft">
            Also in the collection
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            {specimens
              .filter((s) => s.slug !== spec.slug)
              .map((s) => (
                <li key={s.slug}>
                  <Link href={`/specimen/${s.slug}`} className="group flex items-baseline gap-2">
                    <span className="font-mono text-[0.55rem] text-[var(--gold-ink)]">
                      {String(specimens.indexOf(s) + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[1.02rem] leading-tight text-ink transition-colors group-hover:text-[var(--gold-ink)]">
                      {s.name}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>

        <SynthFooter />
      </main>
    </>
  );
}
