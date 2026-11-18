import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { decodeBouquet, bouquetTitle } from "@/lib/bouquet";
import { palettes, specimenBySlug } from "@/lib/specimens";
import { synthSite } from "@/lib/site";

export const runtime = "nodejs";
export const alt = `${synthSite.name} — ${synthSite.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share cards are generated from the same URL state as the scene. */
/*
 * satori only knows the fonts you hand it, so the card had been falling back to the
 * generic sans while every other surface moved to Cormorant.
 *
 * The faces are vendored into assets/fonts rather than read out of node_modules: a
 * node_modules path is not traced into the serverless bundle, and the first attempt at
 * this returned a 500 in production while working perfectly locally.
 */
const FONT_DIR = join(process.cwd(), "assets", "fonts");

async function loadSerif(file: string) {
  return readFile(join(FONT_DIR, file));
}

export async function GET(request: Request) {
  const [serif, serifItalic] = await Promise.all([
    loadSerif("og-serif.woff"),
    loadSerif("og-serif-italic.woff"),
  ]);
  const { searchParams } = new URL(request.url);
  const config = decodeBouquet(searchParams);
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
          padding: 64,
          background: `radial-gradient(120% 120% at 78% 8%, ${palette.swatch[1]} 0%, ${palette.swatch[0]} 58%, #2a1215 100%)`,
          color: "#2a1215",
          fontFamily: "Cormorant",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 999,
                border: "1px solid #a9803f",
              }}
            >
              <div style={{ width: 11, height: 11, borderRadius: 999, background: "#9e2b3e" }} />
            </div>
            <div style={{ fontSize: 19, letterSpacing: 7, textTransform: "uppercase" }}>Flora-Synth</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 108, lineHeight: 0.92, letterSpacing: -1, maxWidth: 860 }}>{title}</div>
            <div style={{ fontSize: 30, opacity: 0.66, maxWidth: 760, fontStyle: "italic" }}>{names}</div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(169,128,63,0.55)",
              paddingTop: 22,
              fontSize: 18,
              letterSpacing: 3,
              textTransform: "uppercase",
              opacity: 0.55,
            }}
          >
            <span>
              {config.density} stems · {config.arrangement} · {palette.name}
            </span>
            <span>seed {config.seed.toString(36).toUpperCase()}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cormorant", data: serif, weight: 500, style: "normal" },
        { name: "Cormorant", data: serifItalic, weight: 400, style: "italic" },
      ],
    }
  );
}
