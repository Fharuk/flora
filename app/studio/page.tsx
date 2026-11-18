import type { Metadata } from "next";

import { Header } from "@/components/synth/header";
import { SynthFooter } from "@/components/synth/notes";
import { Studio } from "@/components/synth/studio";

export const metadata: Metadata = {
  title: "The studio",
  description:
    "Compose a bouquet from ten procedurally generated specimens. Cross two into a hybrid, listen to the arrangement, save it to the garden or export it for a 3D printer.",
  alternates: { canonical: "/studio" },
};

export default function StudioPage() {
  return (
    <>
      <Header />
      <main id="main">
        <Studio />
        <SynthFooter />
      </main>
    </>
  );
}
