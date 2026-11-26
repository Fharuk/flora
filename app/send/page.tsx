import type { Metadata } from "next";

import { Header } from "@/components/synth/header";
import { SynthFooter } from "@/components/synth/notes";
import { SendFlow } from "@/components/send/flow";
import { synthSite } from "@/lib/site";

export const metadata: Metadata = {
  title: "Send a bouquet",
  description:
    "Pick flowers, choose the greenery, arrange them, write the letter and seal it in an envelope. A private link, no account, and every petal drawn in your browser.",
  alternates: { canonical: "/send" },
  openGraph: {
    title: `Send a bouquet — ${synthSite.name}`,
    description: "Five steps from flowers to a sealed envelope. Nothing is a photograph.",
    images: ["/api/og?seed=20831&f=gh-da-ra&p=c&a=s&v=b&d=9&b=86&g=e"],
  },
};

export default function SendPage() {
  return (
    <>
      <Header />
      <main id="main" className="min-h-[100svh] pb-10">
        <SendFlow />
      </main>
      <SynthFooter />
    </>
  );
}
