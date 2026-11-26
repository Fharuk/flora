import type { Metadata } from "next";

import { Header } from "@/components/synth/header";
import { Botany } from "@/components/synth/botany";
import { SynthFooter } from "@/components/synth/notes";

export const metadata: Metadata = {
  title: "Algorithmic botany",
  description:
    "One geometry, two truths: the mesh as the engine writes it beside the same vertices through glass, dispersion and image-based light.",
  alternates: { canonical: "/plot" },
};

export default function PlotPage() {
  return (
    <>
      <Header />
      <main id="main">
        <Botany headingLevel={1} />
        <SynthFooter />
      </main>
    </>
  );
}
