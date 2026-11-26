import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Bench } from "@/components/synth/bench";

/**
 * The algorithm bench.
 *
 * The ten specimens are recipes: six numbers produce a petal ring, and the ring
 * is the flower. Nobody could see those numbers move and the flower follow — the
 * only way to test a change was to edit `specimens.ts`, reload, and hope. This
 * page scrubs all six live and rebuilds the mesh on every frame it changes, which
 * turns five minutes of guesswork into five seconds of seeing.
 *
 * It is a development instrument, so it is off in production unless someone asks
 * for it with `?bench=1`: the page is small, but "edit the collection" is not a
 * thing to hand a visitor who followed a link.
 */
export const metadata: Metadata = {
  title: "The bench",
  description: "Scrub the six numbers a petal ring is built from, and watch the mesh rebuild.",
  robots: { index: false, follow: false },
};

export default async function BenchPage({ searchParams }: { searchParams: Promise<{ bench?: string }> }) {
  const { bench } = await searchParams;
  const open = process.env.NODE_ENV !== "production" || bench === "1";
  if (!open) notFound();

  return <Bench />;
}
