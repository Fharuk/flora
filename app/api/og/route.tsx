import { ImageResponse } from "next/og";

import { decodeBouquet, bouquetTitle } from "@/lib/bouquet";
import { palettes, specimenBySlug } from "@/lib/specimens";
import { synthSite } from "@/lib/site";

export const runtime = "nodejs";
export const alt = `${synthSite.name} — ${synthSite.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share cards are generated from the same URL state as the scene. */
export async function GET(request: Request) {
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
          background: `radial-gradient(120% 120% at 78% 8%, ${palette.swatch[1]} 0%, ${palette.swatch[0]} 62%, #0f1417 100%)`,
          color: "#14110f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: "#14110f" }} />
            <div style={{ fontSize: 20, letterSpacing: 6, textTransform: "uppercase" }}>Flora-Synth</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 92, lineHeight: 0.95, letterSpacing: -2, maxWidth: 820 }}>{title}</div>
            <div style={{ fontSize: 26, opacity: 0.62, maxWidth: 720 }}>{names}</div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(20,17,15,0.18)",
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
    size
  );
}
