import { NextResponse } from "next/server";

import { clientKey, db, hasGarden, rateLimit, TABLES } from "@/lib/db";
import { cleanText, parseVideo, PHOTO_LIMIT, type GiftPhoto, type GiftVoice } from "@/lib/gift";
import { hashPin, isValidPin, makeOwnerKey, hashOwnerKey, verifyOwnerKey as verifyOwner } from "@/lib/gift-secret";
import { GARDEN_COLUMNS, isCode, makeCode, parseSubmission, toEntry } from "@/lib/garden";

export const dynamic = "force-dynamic";

/**
 * Receiving a gift.
 *
 * Two things happen here and they are deliberately separate:
 *
 *   POST   creates the gift. It hands back the code the sender shares *and* a one-time
 *          owner key they keep. The key is never stored in the clear, so this response is
 *          the only moment it exists — if it is lost, the gift is still readable but can
 *          no longer be edited or deleted.
 *
 * and the PIN check is its own route (`/api/gift/[code]/unlock`) because a wrong PIN must
 * be rate-limited per gift, not per request.
 *
 * media may be attached to an existing gift by the owner, which is why PATCH exists.
 */

const MAX_CONFIG = 400;

type CreateBody = {
  config?: unknown;
  creator?: unknown;
  message?: unknown;
  recipient?: unknown;
  register?: unknown;
  pin?: unknown;
  video?: unknown;
  photos?: unknown;
  voice?: unknown;
};

/** Media items are validated as *references*, never as data: the bytes go to storage. */
function parsePhotos(input: unknown, code: string): GiftPhoto[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, PHOTO_LIMIT)
    .map((item, i): GiftPhoto | null => {
      if (!item || typeof item !== "object") return null;
      const ratio = Number((item as { ratio?: unknown }).ratio);
      const alt = cleanText((item as { alt?: unknown }).alt, 140);
      // the path is rebuilt from the code and the index, so it can only ever name this
      // gift's own objects
      return {
        path: `${code}/photo-${i}`,
        alt: alt || `Photograph ${i + 1}`,
        ratio: Number.isFinite(ratio) && ratio > 0.2 && ratio < 5 ? ratio : 1,
      };
    })
    .filter((p): p is GiftPhoto => p !== null);
}

function parseVoice(input: unknown): GiftVoice | null {
  if (!input || typeof input !== "object") return null;
  const duration = Number((input as { duration?: unknown }).duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return { path: "", duration: Math.min(600, Math.round(duration)) };
}

export async function POST(request: Request) {
  const client = db();
  if (!client) return NextResponse.json({ error: "no-database" }, { status: 503 });

  // a gift is more expensive than a garden bouquet, so it is throttled harder
  if (!rateLimit(`gift:${clientKey(request)}`, 4, 60_000)) {
    return NextResponse.json({ error: "too-many" }, { status: 429 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (typeof body.config !== "string" || body.config.length > MAX_CONFIG) {
    return NextResponse.json({ error: "bad-bouquet" }, { status: 400 });
  }

  const submission = parseSubmission({ config: body.config, creator: body.creator, message: body.message });
  if (!submission) return NextResponse.json({ error: "bad-bouquet" }, { status: 400 });

  // A PIN is optional, but if one was typed it has to be usable. Silently dropping a
  // malformed PIN would send a private letter by open link while the sender believes it
  // is locked, which is the worst possible failure for this feature.
  let pinHash: string | null = null;
  if (typeof body.pin === "string" && body.pin.trim()) {
    const pin = body.pin.trim();
    if (!isValidPin(pin)) return NextResponse.json({ error: "bad-pin" }, { status: 400 });
    pinHash = await hashPin(pin);
  }

  const code = makeCode();
  const ownerKey = makeOwnerKey();
  const config = submission.config;

  const photos = parsePhotos(body.photos, code);
  const voice = parseVoice(body.voice);
  const video = parseVideo(body.video);
  const register = typeof body.register === "string" ? cleanText(body.register, 24) : "glass";

  const row = {
    code,
    config: submission.encoded,
    title: submission.title,
    species: config.species,
    palette: config.palette,
    arrangement: config.arrangement,
    vessel: config.vessel,
    density: config.density,
    bloom: Math.round(config.bloom * 100),
    seed: config.seed,
    creator: submission.creator,
    message: submission.message,
    guest: null,
    recipient: cleanText(body.recipient, 48) || null,
    register: ["glass", "strings", "nocturne", "chamber", "silence"].includes(register) ? register : "glass",
    pin_hash: pinHash,
    owner_hash: hashOwnerKey(ownerKey),
    photos: photos.map((p) => ({ path: p.path, alt: p.alt, ratio: p.ratio })),
    voice: voice ? { path: `${code}/voice`, duration: voice.duration } : null,
    video,
    status: "sealed",
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await client.from(TABLES.bouquets).insert(row).select("code,created_at").single();
    if (!error && data) {
      return NextResponse.json(
        {
          code: data.code,
          created_at: data.created_at,
          // handed over exactly once; the database keeps only its hash
          ownerKey,
          locked: Boolean(pinHash),
          photos: photos.length,
          hasVoice: Boolean(voice),
          hasVideo: Boolean(video),
        },
        { status: 201 }
      );
    }
    if (error?.code !== "23505") {
      return NextResponse.json({ error: "insert-failed" }, { status: 500 });
    }
    row.code = makeCode();
  }

  return NextResponse.json({ error: "insert-failed" }, { status: 500 });
}

/**
 * Reading a gift back for the studio preview: only ever the public face of it, and only
 * when the caller presents the owner key. This is how the sender revisits what they sent
 * without an account.
 */
export async function GET(request: Request) {
  const client = db();
  if (!client) return NextResponse.json({ error: "no-database" }, { status: 503 });

  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const key = request.headers.get("x-flora-key") ?? url.searchParams.get("key") ?? "";
  if (!isCode(code) || !key) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const { data, error } = await client
    .from(TABLES.bouquets)
    .select(`${GARDEN_COLUMNS},owner_hash,recipient,register,photos,voice,video,pin_hash,status`)
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const row = data as Record<string, unknown>;
  if (!verifyOwner(key, typeof row.owner_hash === "string" ? row.owner_hash : null)) {
    // an unauthorised probe gets the same answer as a missing gift
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  return NextResponse.json({
    entry: toEntry(row),
    recipient: row.recipient ?? null,
    register: row.register ?? "glass",
    locked: Boolean(row.pin_hash),
    photos: row.photos ?? [],
    voice: row.voice ?? null,
    video: row.video ?? null,
    hasGarden: hasGarden(),
  });
}

/** Delete a gift the sender owns. Media removal is the client's job before this call. */
export async function DELETE(request: Request) {
  const client = db();
  if (!client) return NextResponse.json({ error: "no-database" }, { status: 503 });

  const key = request.headers.get("x-flora-key") ?? "";
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!isCode(code) || !key) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const { data } = await client
    .from(TABLES.bouquets)
    .select("owner_hash")
    .eq("code", code)
    .maybeSingle();

  if (!data || !verifyOwner(key, (data as { owner_hash?: string }).owner_hash ?? null)) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  await client.storage.from("flora-gifts").remove([
    `${code}/voice.webm`,
    ...[0, 1, 2, 3, 4].map((i) => `${code}/photo-${i}.webp`),
  ]);

  const { error } = await client.from(TABLES.bouquets).delete().eq("code", code);
  if (error) return NextResponse.json({ error: "delete-failed" }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
