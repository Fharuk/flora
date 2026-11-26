import { NextResponse } from "next/server";

import { clientKey, db, rateLimit, TABLES } from "@/lib/db";
import {
  ALLOWED_PHOTO_TYPES,
  ALLOWED_VOICE_TYPES,
  extensionFor,
  PHOTO_LIMIT,
  photoPath,
  voicePath,
  type GiftPhoto,
  type GiftVoice,
} from "@/lib/gift";
import { verifyOwnerKey } from "@/lib/gift-secret";
import { isCode } from "@/lib/garden";

export const dynamic = "force-dynamic";

/**
 * Uploading a photograph or a voice.
 *
 * The bytes come through this handler rather than going straight from the browser to
 * storage. That is a deliberate trade: it costs a little function bandwidth, and in
 * return the browser never holds a storage credential, every upload is authorised
 * against the gift's owner key, and the object path is chosen by the server. A client
 * that could pick its own path could overwrite somebody else's photograph.
 *
 * The body is capped below Vercel's 4.5 MB request limit, so a large phone photograph has
 * to be resized in the browser before it gets here — which the card step does.
 */
const MAX_PHOTO_BYTES = 2_600_000;
const MAX_VOICE_BYTES = 3_200_000;

/** Sniff the container, because a Content-Type header is a claim, not a fact. */
function looksLike(bytes: Uint8Array, mime: string): boolean {
  const at = (offset: number, ascii: string) =>
    ascii.split("").every((ch, i) => bytes[offset + i] === ch.charCodeAt(0));

  if (mime.startsWith("image/")) {
    if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
    if (mime === "image/png") return bytes[0] === 0x89 && at(1, "PNG");
    if (mime === "image/webp") return at(0, "RIFF") && at(8, "WEBP");
    if (mime === "image/avif") return at(4, "ftyp") && at(8, "avif");
    return false;
  }

  // audio: webm (matroska), mp4/m4a, mp3, ogg, wav
  return at(0, "\x1aE\xdf\xa3") || at(4, "ftyp") || at(0, "ID3") || at(0, "OggS") || at(0, "RIFF");
}

export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isCode(code)) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const client = db();
  if (!client) return NextResponse.json({ error: "no-database" }, { status: 503 });

  if (!rateLimit(`media:${clientKey(request)}`, 12, 60_000)) {
    return NextResponse.json({ error: "too-many" }, { status: 429 });
  }

  const key = request.headers.get("x-flora-key") ?? "";
  if (!key) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const { data, error } = await client
    .from(TABLES.bouquets)
    .select("owner_hash,photos,voice")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const row = data as { owner_hash: string | null; photos: GiftPhoto[] | null; voice: GiftVoice | null };
  if (!verifyOwnerKey(key, row.owner_hash)) return NextResponse.json({ error: "not-found" }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "bad-form" }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no-file" }, { status: 400 });

  const mime = file.type || "application/octet-stream";
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (kind === "photo") {
    const index = Number(form.get("index") ?? 0);
    if (!Number.isInteger(index) || index < 0 || index >= PHOTO_LIMIT) {
      return NextResponse.json({ error: "bad-index" }, { status: 400 });
    }
    if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(mime)) {
      return NextResponse.json({ error: "bad-type" }, { status: 415 });
    }
    if (bytes.byteLength > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "too-large" }, { status: 413 });
    }
    if (!looksLike(bytes, mime)) return NextResponse.json({ error: "bad-file" }, { status: 415 });

    const path = `${photoPath(code, index, extensionFor(mime))}`;
    const alt = String(form.get("alt") ?? "").slice(0, 140);
    const ratioRaw = Number(form.get("ratio") ?? 1);
    const ratio = Number.isFinite(ratioRaw) && ratioRaw > 0.2 && ratioRaw < 5 ? ratioRaw : 1;

    const up = await client.storage.from("flora-gifts").upload(path, bytes, { contentType: mime, upsert: true });
    if (up.error) return NextResponse.json({ error: "upload-failed" }, { status: 500 });

    // the row stores references, and replaces the one at this index rather than appending
    const photos = [...(row.photos ?? [])];
    photos[index] = { path, alt: alt || `Photograph ${index + 1}`, ratio };
    const pruned = photos.filter((p): p is GiftPhoto => Boolean(p && p.path)).slice(0, PHOTO_LIMIT);

    const { error: saveError } = await client
      .from(TABLES.bouquets)
      .update({ photos: pruned })
      .eq("code", code);
    if (saveError) return NextResponse.json({ error: "save-failed" }, { status: 500 });

    return NextResponse.json({ ok: true, photo: photos[index], count: pruned.length });
  }

  if (kind === "voice") {
    if (!(ALLOWED_VOICE_TYPES as readonly string[]).includes(mime)) {
      return NextResponse.json({ error: "bad-type" }, { status: 415 });
    }
    if (bytes.byteLength > MAX_VOICE_BYTES) {
      return NextResponse.json({ error: "too-large" }, { status: 413 });
    }
    if (!looksLike(bytes, mime)) return NextResponse.json({ error: "bad-file" }, { status: 415 });

    const duration = Math.min(600, Math.max(1, Math.round(Number(form.get("duration") ?? 0) || 0)));
    const path = voicePath(code);

    const up = await client.storage.from("flora-gifts").upload(path, bytes, { contentType: mime, upsert: true });
    if (up.error) return NextResponse.json({ error: "upload-failed" }, { status: 500 });

    const voice: GiftVoice = { path, duration };
    const { error: saveError } = await client.from(TABLES.bouquets).update({ voice }).eq("code", code);
    if (saveError) return NextResponse.json({ error: "save-failed" }, { status: 500 });

    return NextResponse.json({ ok: true, voice });
  }

  return NextResponse.json({ error: "bad-kind" }, { status: 400 });
}

/**
 * Removing one photograph, or the voice note.
 *
 * A sender who changes their mind deserves for the file to actually go, not merely to
 * stop being referenced: leaving a stranger's portrait in a bucket is a privacy failure
 * even if no page ever shows it again.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isCode(code)) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const client = db();
  if (!client) return NextResponse.json({ error: "no-database" }, { status: 503 });

  const key = request.headers.get("x-flora-key") ?? "";
  const url = new URL(request.url);
  const index = url.searchParams.get("photo");
  const removeVoice = url.searchParams.get("voice") === "1";
  if (!key) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const { data } = await client
    .from(TABLES.bouquets)
    .select("owner_hash,photos,voice")
    .eq("code", code)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const row = data as { owner_hash: string | null; photos: GiftPhoto[] | null; voice: GiftVoice | null };
  if (!verifyOwnerKey(key, row.owner_hash)) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (removeVoice && row.voice?.path) {
    await client.storage.from("flora-gifts").remove([row.voice.path]);
    await client.from(TABLES.bouquets).update({ voice: null }).eq("code", code);
    return NextResponse.json({ ok: true });
  }

  if (index !== null) {
    const i = Number(index);
    const photos = [...(row.photos ?? [])];
    const target = photos[i];
    if (!target) return NextResponse.json({ error: "not-found" }, { status: 404 });

    await client.storage.from("flora-gifts").remove([target.path]);
    // closing the gap keeps the indices contiguous, so the gallery never shows a hole
    photos.splice(i, 1);
    await client.from(TABLES.bouquets).update({ photos }).eq("code", code);
    return NextResponse.json({ ok: true, photos });
  }

  return NextResponse.json({ error: "bad-request" }, { status: 400 });
}
