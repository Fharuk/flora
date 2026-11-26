"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Photographs.
 *
 * Five is the cap, and it is a design decision rather than a technical one: a gift that
 * carries five pictures is a story, and one that carries forty is somebody's camera roll.
 *
 * Everything is resized here, in the browser, before it goes anywhere. A phone photograph
 * is 4–8 MB, which is over the request limit of the function that receives it — so the
 * file is drawn to a canvas at a long edge of 1800 px and re-encoded. Two things fall out
 * of that: the upload fits, and the recipient's page is fast even on a train. EXIF is
 * dropped in the process, which is a privacy improvement at no cost.
 */

const MAX_LONG_EDGE = 1800;
const JPEG_QUALITY = 0.88;
const LIMIT = 5;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export type PreparedPhoto = {
  /** a local object URL, used for the preview only */
  preview: string;
  blob: Blob;
  alt: string;
  ratio: number;
  width: number;
  height: number;
};

async function prepare(file: File): Promise<PreparedPhoto | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > MAX_INPUT_BYTES) return null;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;

  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  // a white ground: a transparent PNG would otherwise turn black in a JPEG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return null;

  return {
    preview: URL.createObjectURL(blob),
    blob,
    alt: "",
    ratio: width / height,
    width,
    height,
  };
}

export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  onAlt,
}: {
  photos: { id: string; dataUrl: string; alt: string; ratio: number }[];
  onAdd: (photo: PreparedPhoto) => void;
  onRemove: (id: string) => void;
  onAlt: (id: string, alt: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = photos.length >= LIMIT;

  const take = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      const room = LIMIT - photos.length;
      const chosen = Array.from(files).slice(0, room);
      for (const file of chosen) {
        const prepared = await prepare(file);
        if (prepared) onAdd(prepared);
      }
      if (files.length > room) setError(`Only ${LIMIT} photographs fit. The rest were ignored.`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">
            Photographs · {photos.length} of {LIMIT}
          </p>
          <p className="mt-1.5 max-w-[28rem] text-[0.78rem] leading-snug opacity-55">
            Resized here before they leave your device. They are stored privately and only appear
            after the envelope is opened.
          </p>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((photo) => (
          <li key={photo.id} className="group relative">
            <div
              className="relative overflow-hidden rounded-sm border border-current/12 bg-current/5"
              style={{ aspectRatio: String(photo.ratio || 1) }}
            >
              {photo.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset
                <img src={photo.dataUrl} alt={photo.alt || "A photograph for the gift"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[0.6rem] opacity-40">
                  already sent
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              aria-label="Remove this photograph"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 size={11} aria-hidden />
            </button>
            <input
              type="text"
              value={photo.alt}
              onChange={(e) => onAlt(photo.id, e.target.value)}
              placeholder="Describe it"
              aria-label="Describe this photograph for someone who cannot see it"
              className="mt-1.5 w-full rounded-[2px] border border-current/12 bg-transparent px-1.5 py-1 text-[0.62rem] outline-none placeholder:opacity-40 focus:border-current/35"
            />
          </li>
        ))}

        {!full ? (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className={cn(
                "flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-current/20 transition-colors hover:border-current/40"
              )}
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin opacity-50" aria-hidden />
              ) : (
                <ImagePlus size={16} className="opacity-45" aria-hidden />
              )}
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] opacity-50">
                {busy ? "Preparing" : "Add"}
              </span>
            </button>
          </li>
        ) : null}
      </ul>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="sr-only"
        onChange={(e) => void take(e.target.files)}
      />

      {error ? (
        <p role="alert" className="mt-2 text-[0.72rem] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
