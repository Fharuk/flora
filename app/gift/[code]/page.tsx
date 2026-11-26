import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiftExperience } from "@/components/synth/gift";
import { Header } from "@/components/synth/header";
import { SynthFooter } from "@/components/synth/notes";
import { db, TABLES } from "@/lib/db";
import { GARDEN_COLUMNS, isCode, toEntry, type GardenEntry } from "@/lib/garden";
import type { GiftVideo } from "@/lib/gift";
import { synthSite } from "@/lib/site";

export const dynamic = "force-dynamic";

type GiftRow = GardenEntry & {
  recipient: string | null;
  register: string;
  pin_hash: string | null;
  video: GiftVideo | null;
};

const GIFT_COLUMNS = `${GARDEN_COLUMNS},recipient,register,pin_hash,video`;

async function loadEntry(code: string): Promise<GiftRow | null> {
  if (!isCode(code)) return null;
  const client = db();
  if (!client) return null;
  const { data, error } = await client
    .from(TABLES.bouquets)
    .select(GIFT_COLUMNS)
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...toEntry(row),
    recipient: typeof row.recipient === "string" ? row.recipient : null,
    register: typeof row.register === "string" ? row.register : "glass",
    pin_hash: typeof row.pin_hash === "string" ? row.pin_hash : null,
    video: (row.video as GiftVideo | null) ?? null,
  };
}

/**
 * The card the sender's link previews as.
 *
 * Deliberately *not* the letter: the message is for the recipient, and a gift link pasted
 * into a group chat would otherwise unfurl with the private note printed on it. The title
 * names the recipient and the bouquet, the description says only that something is
 * waiting, and the image is the bouquet itself, which is not a secret once it is sent.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const entry = await loadEntry(code);
  if (!entry) return { title: "Not found", robots: { index: false } };

  const title = entry.recipient ? `${entry.title} — for ${entry.recipient}` : entry.title;
  const description = entry.recipient
    ? `A sealed bouquet for ${entry.recipient}. Open it to read the letter.`
    : "A sealed bouquet. Open it to read the letter.";

  return {
    title,
    description,
    alternates: { canonical: `/gift/${code}` },
    // the unboxing itself is private theatre; the card is the public face
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: [`/api/og?${entry.config}`],
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GiftPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const entry = await loadEntry(code);
  if (!entry) notFound();

  return (
    <>
      <Header />
      <main id="main">
        <GiftExperience
          entry={entry}
          recipient={entry.recipient}
          register={entry.register}
          // a PIN on the row is the only thing that makes the envelope lock
          locked={Boolean(entry.pin_hash)}
          video={entry.video}
        />
        <SynthFooter />
      </main>
    </>
  );
}
