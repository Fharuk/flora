import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { specimenSheetPng } from "@/lib/og-art";
import { synthSite } from "@/lib/site";
import { specimenBySlug } from "@/lib/specimens";

/**
 * The shared half of both share cards.
 *
 * A bouquet card and a specimen card are the same object with different words in
 * it: the same plum, the same hairline, the same right-hand panel of drawn glass.
 * Keeping the chrome in one place is what stops the two drifting apart the next
 * time either is touched. The routes themselves only differ in what they put in
 * the middle of the type column and what they draw in the panel.
 */

const FONT_DIR = join(process.cwd(), "assets", "fonts");

type Face = { name: string; data: Buffer; weight: 300 | 500 | 600; style: "normal" };

export async function optionalFonts(): Promise<Face[] | undefined> {
  try {
    const [serif, wordmark, mono] = await Promise.all([
      readFile(join(FONT_DIR, "og-fraunces.woff")),
      readFile(join(FONT_DIR, "og-fraunces-word.woff")),
      readFile(join(FONT_DIR, "og-geist.woff")),
    ]);
    // these are static instances of the variable face, so each declares the
    // weight it was pinned to; satori takes weights in 100s
    return [
      { name: "Fraunces", data: serif, weight: 300, style: "normal" },
      { name: "Fraunces", data: wordmark, weight: 600, style: "normal" },
      { name: "Geist", data: mono, weight: 500, style: "normal" },
    ];
  } catch {
    // a missing face should cost the card its serif, not its whole response
    return undefined;
  }
}

/** Several garnets in the film's palette, keyed so each card pulls its own. */
export const GROUNDS = ["#7d1f2f", "#9e2b3e", "#5c1622", "#3f1219"];

export function groundFor(seed: number) {
  return GROUNDS[Math.abs(seed) % GROUNDS.length];
}

export function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 999,
          border: "1px solid #a9803f",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 999, background: "#9e2b3e" }} />
      </div>
      <div
        style={{
          fontFamily: "Fraunces",
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: "#f3d9d2",
        }}
      >
        FLORA-SYNTH
      </div>
    </div>
  );
}

export function Panel({ art, ground }: { art: Buffer | null; ground: string }) {
  return (
    <div style={{ display: "flex", position: "relative", width: 640, height: 630, background: ground }}>
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${art.toString("base64")}`}
          width={640}
          height={630}
          style={{ position: "absolute", left: 0, top: 0 }}
          alt=""
        />
      ) : null}
    </div>
  );
}

export const cardSize = { width: 1200, height: 630 };

export const cardHeaders = {
  // a card is a pure function of its URL, so crawlers and messengers can keep it
  "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
};

export const defaultAlt = `${synthSite.name}, ${synthSite.tagline.toLowerCase()}`;

/** Draws one specimen on the panel, or nothing if it cannot be drawn. */
export async function sheetFor(slug: string): Promise<Buffer | null> {
  if (!specimenBySlug.has(slug)) return null;
  try {
    const seed = [...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    return await specimenSheetPng(slug, seed);
  } catch {
    return null;
  }
}
