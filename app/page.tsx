import type { Metadata } from "next";

import { Botany } from "@/components/synth/botany";
import { Header } from "@/components/synth/header";
import { Instrument, InstrumentControls } from "@/components/synth/instrument";
import { Notes, SynthFooter } from "@/components/synth/notes";
import { Vitrine } from "@/components/synth/vitrine";
import { specimenSlugs } from "@/lib/specimens";
import { synthSite } from "@/lib/site";

export const metadata: Metadata = {
  title: `${synthSite.name} — ${synthSite.tagline}`,
  description: synthSite.description,
  alternates: { canonical: "/" },
};

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
    about: specimenSlugs.map((slug) => ({ "@type": "Thing", name: slug })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // static structured data built from local content
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <Instrument>
          <InstrumentControls />
          <Botany />
          <Vitrine />
          <Notes />
        </Instrument>
        <SynthFooter />
      </main>
    </>
  );
}
