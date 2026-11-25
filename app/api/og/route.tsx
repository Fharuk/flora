import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { decodeBouquet, bouquetTitle, type BouquetConfig } from "@/lib/bouquet";
import { specimenPng } from "@/lib/og-art";
import { palettes, specimenBySlug } from "@/lib/specimens";
import { synthSite } from "@/lib/site";

export const runtime = "nodejs";
export const alt = `${synthSite.name}, ${synthSite.tagline.toLowerCase()}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Share cards are generated from the same URL state as the scene.
 *
 * The card used to be typographic: a title, three specimen names, and the
 * instrument's Cormorant at 108px. It said nothing about what the site looks
 * like, and Cormorant is not even the film's face. It is now a split card: the
 * film's Fraunces on the left, and on the right a specimen drawn by `og-art`
 * from the bouquet's own numbers, rasterised by sharp and laid in as a PNG.
 *
 * The faces are vendored into assets/fonts rather than read out of node_modules:
 * a node_modules path is not traced into the serverless bundle, and an earlier
 * attempt at this returned a 500 in production while working locally.
 */
const FONT_DIR = join(process.cwd(), "assets", "fonts");

async function optionalFonts() {
  try {
    const [serif, wordmark, mono] = await Promise.all([
      readFile(join(FONT_DIR, "og-fraunces.woff")),
      readFile(join(FONT_DIR, "og-fraunces-word.woff")),
      readFile(join(FONT_DIR, "og-geist.woff")),
    ]);
    // satori takes a weight from its own union; these are static instances of
    // the variable face, so each one declares the weight it was pinned to
    type Face = { name: string; data: Buffer; weight: 300 | 500 | 600; style: "normal" };
    const faces: Face[] = [
      { name: "Fraunces", data: serif, weight: 300, style: "normal" },
      { name: "Fraunces", data: wordmark, weight: 600, style: "normal" },
      { name: "Geist", data: mono, weight: 500, style: "normal" },
    ];
    return faces;
  } catch {
    // a missing face should cost the card its serif, not its whole response
    return undefined;
  }
}

/** Several garnets in the film's palette, keyed so each card pulls its own. */
const GROUNDS = ["#7d1f2f", "#9e2b3e", "#5c1622", "#3f1219"];

function ground(config: BouquetConfig) {
  return GROUNDS[Math.abs(config.seed) % GROUNDS.length];
}

export async function GET(request: Request) {
  const [fonts, art] = await Promise.all([
    optionalFonts(),
    specimenPng(decodeBouquet(new URL(request.url).searchParams)).catch(() => null),
  ]);

  const config = decodeBouquet(new URL(request.url).searchParams);
  const palette = palettes[config.palette];
  const title = bouquetTitle(config);
  const names = config.species
    .map((slug) => specimenBySlug.get(slug)?.name ?? slug)
    .slice(0, 3)
    .join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#1a0a0f",
          color: "#fbf4ec",
          fontFamily: "Fraunces",
        }}
      >
        {/* the type column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 560,
            padding: "58px 48px 54px 64px",
          }}
        >
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

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, lineHeight: 0.94, letterSpacing: -1.4, maxWidth: 440 }}>{title}</div>
            <div style={{ display: "flex", fontSize: 25, marginTop: 20, color: "#e7c2bb", maxWidth: 430 }}>
              {names}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 30,
                fontFamily: "Geist",
                fontSize: 15,
                letterSpacing: 2.6,
                textTransform: "uppercase",
                color: "#c99a93",
              }}
            >
              <div style={{ display: "flex", width: 26, height: 1, background: "#a9803f" }} />
              <div style={{ display: "flex" }}>Ten specimens, drawn in the browser</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(169,128,63,0.45)",
              paddingTop: 18,
              fontFamily: "Geist",
              fontSize: 14,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              color: "#b98d86",
            }}
          >
            <div style={{ display: "flex" }}>
              {config.density} stems · {config.arrangement} · {palette.name}
            </div>
            <div style={{ display: "flex" }}>seed {config.seed.toString(36).toUpperCase()}</div>
          </div>
        </div>

        {/* the art panel: the specimen, bleeding off three edges */}
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 640,
            height: 630,
            background: ground(config),
          }}
        >
          {art
            ? // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${art.toString("base64")}`}
                width={640}
                height={630}
                style={{ position: "absolute", left: 0, top: 0 }}
                alt=""
              />
            : null}
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonts ? { fonts } : {}),
      // the recipe is in the URL, so a given card never changes: let crawlers
      // and messengers keep it instead of asking the function again
      headers: { "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable" },
    }
  );
}
