import type { Metadata } from "next";

import { ChapterAnnouncer, ChapterRail, FilmEssay } from "@/components/stamen/A11y";
import Stage from "@/components/stamen/Stage";
import FilmLink from "@/components/stamen/FilmLink";
import Loader from "@/components/stamen/Loader";
import Nav from "@/components/stamen/Nav";
import Hud from "@/components/stamen/Hud";
import Cart from "@/components/stamen/Cart";
import Build from "@/components/stamen/Build";
import { Bloom, Scatter, Closer, Stems } from "@/components/stamen/Chapters";
import { Care, Footer } from "@/components/stamen/Care";
import { SPECIES } from "@/lib/stamen/flora";
import { synthSite } from "@/lib/site";

export const metadata: Metadata = {
  title: `${synthSite.name} — ${synthSite.tagline}`,
  description: synthSite.description,
  alternates: { canonical: "/" },
};

/**
 * Flora-Synth, as one live 3D film you scroll through.
 *
 * A bouquet opens over three days of window light, its petals scatter at the
 * lens, the camera goes into an anemone's stamens, then through the ten
 * specimens one by one, and finally into a composition you build yourself.
 * Every flower, the vase, the wrap and the light are built in code in the
 * browser — no model, image or video file is ever fetched.
 *
 * The film owns the homepage. The instrument that used to live here still runs,
 * unchanged, at /compose, /studio, /collection and /plot.
 */
export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: synthSite.name,
    description: synthSite.description,
    url: synthSite.url,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    about: Object.values(SPECIES).map((s) => ({ "@type": "Thing", name: s.name })),
  };

  return (
    <div className="stamen relative">
      <script
        type="application/ld+json"
        // static structured data built from local content
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Stage />
      <FilmLink />
      <Loader />
      <Nav />
      <Hud />
      <ChapterAnnouncer />
      <ChapterRail />
      <FilmEssay />
      <main id="main" className="stamen-chapters relative z-10">
        <Bloom />
        <Scatter />
        <Closer />
        <Stems />
        <Build />
        <Care />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <Cart />
    </div>
  );
}
