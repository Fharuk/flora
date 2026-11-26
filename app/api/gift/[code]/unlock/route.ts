import { NextResponse } from "next/server";

import { clientKey, db, rateLimit, TABLES } from "@/lib/db";
import { SIGNED_URL_TTL, type GiftMedia } from "@/lib/gift";
import { isValidPin, MAX_PIN_ATTEMPTS, verifyPin } from "@/lib/gift-secret";
import { isCode } from "@/lib/garden";

export const dynamic = "force-dynamic";

/**
 * Opening a sealed gift.
 *
 * The PIN is checked here and nowhere else, because this is the only place that can both
 * read the hash and mint a signed URL. The recipient's page never holds a storage
 * credential and never sees a path it can turn into an image on its own.
 *
 * Two throttles, because they defend against different things:
 *
 *   per gift      MAX_PIN_ATTEMPTS in the row: a five-digit code is not free to guess,
 *                 and the count survives a restart because it lives in Postgres.
 *   per caller    a short window: stops one client from walking the whole keyspace.
 *
 * A successful unlock mints an hour of signed URLs for the photographs and the voice.
 * Those URLs are *not* the credential — they are the result of one — so a leaked URL
 * expires, while possession of the link alone never opens the media.
 */
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isCode(code)) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const client = db();
  if (!client) return NextResponse.json({ error: "no-database" }, { status: 503 });

  if (!rateLimit(`unlock:${code}:${clientKey(request)}`, 6, 60_000)) {
    return NextResponse.json({ error: "too-many" }, { status: 429 });
  }

  let pin = "";
  try {
    const body = (await request.json()) as { pin?: unknown };
    pin = typeof body.pin === "string" ? body.pin.trim() : "";
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const { data, error } = await client
    .from(TABLES.bouquets)
    .select("pin_hash,attempts,photos,voice")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const row = data as {
    pin_hash: string | null;
    attempts: number | null;
    photos: { path: string; alt: string; ratio: number }[] | null;
    voice: { path: string; duration: number } | null;
  };

  /*
   * No PIN means there is nothing to check — but the media still has to be signed.
   * Returning early here with empty media (which this route used to do) meant an open
   * gift silently lost its photographs and its voice: the page only called unlock for
   * locked gifts, and even when it did, this branch handed back nothing to show.
   */
  if (!row.pin_hash) {
    const media = await signMedia(client, code, row.photos ?? [], row.voice ?? null);
    return NextResponse.json({ media, unlocked: true });
  }

  const attempts = Number(row.attempts ?? 0);
  if (attempts >= MAX_PIN_ATTEMPTS) {
    return NextResponse.json({ error: "locked-out" }, { status: 423 });
  }

  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "bad-pin", remaining: MAX_PIN_ATTEMPTS - attempts }, { status: 400 });
  }

  const ok = await verifyPin(pin, row.pin_hash);
  if (!ok) {
    const next = attempts + 1;
    // the increment is unconditional; a failed guess has to cost something even if the
    // request itself never returns
    await client.from(TABLES.bouquets).update({ attempts: next }).eq("code", code);
    return NextResponse.json(
      { error: "wrong-pin", remaining: Math.max(0, MAX_PIN_ATTEMPTS - next) },
      { status: 401 }
    );
  }

  // a correct PIN clears the tally, so a forgotten-password day does not brick the link
  if (attempts > 0) {
    await client.from(TABLES.bouquets).update({ attempts: 0 }).eq("code", code);
  }

  const media = await signMedia(client, code, row.photos ?? [], row.voice ?? null);
  return NextResponse.json({ unlocked: true, media });
}

async function signMedia(
  client: NonNullable<ReturnType<typeof db>>,
  code: string,
  photos: { path: string; alt: string; ratio: number }[],
  voice: { path: string; duration: number } | null
): Promise<GiftMedia> {
  const paths = photos.map((p) => p.path);
  if (voice?.path) paths.push(voice.path);
  if (!paths.length) return emptyMedia();

  const { data } = await client.storage.from("flora-gifts").createSignedUrls(paths, SIGNED_URL_TTL);
  const byPath = new Map<string, string>();
  // A malformed storage response must degrade to "no media", never to a 500 on the page:
  // the letter is the gift, and it should still open if the bucket is having a bad day.
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item?.path && item?.signedUrl && !item.error) byPath.set(item.path, item.signedUrl);
    }
  }

  return {
    photos: photos
      .map((p) => {
        const url = byPath.get(p.path);
        return url ? { path: p.path, alt: p.alt, ratio: p.ratio, url } : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),
    voice:
      voice && byPath.get(voice.path)
        ? { path: voice.path, duration: voice.duration, url: byPath.get(voice.path)! }
        : null,
    video: null,
  };
}

function emptyMedia(): GiftMedia {
  return { photos: [], voice: null, video: null };
}
