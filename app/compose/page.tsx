import type { Metadata } from "next";

import { Header } from "@/components/synth/header";
import { Instrument, InstrumentControls } from "@/components/synth/instrument";
import { Botany } from "@/components/synth/botany";
import { HybridLab } from "@/components/synth/lab";
import { Vitrine } from "@/components/synth/vitrine";
import { Notes, SynthFooter } from "@/components/synth/notes";

export const metadata: Metadata = {
  title: "Compose",
  description:
    "The full instrument: ten procedurally generated specimens, a deterministic bouquet engine, the hybrid crossing lab, the vitrine and the method behind the material.",
  alternates: { canonical: "/compose" },
};

/**
 * The instrument, exactly as it shipped — it simply moved off the homepage when
 * the film took over the front door.
 */
export default function ComposePage() {
  return (
    <>
      <Header />
      <main id="main">
        <Instrument>
          <InstrumentControls />
          <Botany />
          <HybridLab />
          <Vitrine />
          <Notes />
        </Instrument>
        <SynthFooter />
      </main>
    </>
  );
}
