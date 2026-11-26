import type { Metadata } from "next";

import { Garden } from "@/components/synth/garden";
import { Header } from "@/components/synth/header";
import { SynthFooter } from "@/components/synth/notes";

export const metadata: Metadata = {
  title: "The garden",
  description:
    "Saved compositions, public and permanent. Open one to load it back into the instrument — the arrangement, not a picture of it.",
  alternates: { canonical: "/collection" },
};

export default function CollectionPage() {
  return (
    <>
      <Header />
      <main id="main">
        <Garden headingLevel={1} />
        <SynthFooter />
      </main>
    </>
  );
}
