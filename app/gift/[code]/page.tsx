import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiftExperience } from "@/components/synth/gift";
import { Header } from "@/components/synth/header";
import { SynthFooter } from "@/components/synth/notes";
import { db, TABLES } from "@/lib/db";
import { GARDEN_COLUMNS, isCode, toEntry, type GardenEntry } from "@/lib/garden";
import { synthSite } from "@/lib/site";

export const dynamic = "force-dynamic";

async function loadEntry(code: string): Promise<GardenEntry | null> {
  if (!isCode(code)) return null;
  const client = db();
  if (!client) return null;
  const { data, error } = await client
    .from(TABLES.bouquets)
    .select(GARDEN_COLUMNS)
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return null;
  return toEntry(data as Record<string, unknown>);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const entry = await loadEntry(code);
  if (!entry) return { title: `Not found — ${synthSite.name}` };
  const title = entry.message ? `${entry.title} — for you` : entry.title;
  return {
    title: `${title} — ${synthSite.name}`,
    description: entry.message
      ? `${entry.message} — a bouquet composed in ${synthSite.name}.`
      : "A bouquet composed in Flora-Synth. Nothing here is a photograph.",
    alternates: { canonical: `/gift/${code}` },
    // the unboxing itself is private theatre; the card is the public face
    robots: { index: false },
    openGraph: {
      title,
      description: entry.message ?? "A bouquet composed in Flora-Synth.",
      images: [`/api/og?${entry.config}`],
    },
  };
}

export default async function GiftPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const entry = await loadEntry(code);
  if (!entry) notFound();

  return (
    <>
      <Header />
      <main>
        <GiftExperience entry={entry} />
        <SynthFooter />
      </main>
    </>
  );
}
