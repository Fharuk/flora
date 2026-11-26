import { ImageResponse } from "next/og";

import { cardHeaders, cardSize, defaultAlt, groundFor, optionalFonts, Panel, sheetFor, Wordmark } from "@/lib/og-card";
import { getSpecimen } from "@/lib/hybrids";
import { rarityLabel, specimenRarity, specimens } from "@/lib/specimens";

export const runtime = "nodejs";
export const alt = defaultAlt;
export const size = cardSize;
export const contentType = "image/png";

/**
 * The card for one specimen page.
 *
 * Same object as the bouquet card — same plum, same hairline, same panel — with
 * the plant's own name, family and one line of its record in place of a bouquet
 * title. The panel draws that specimen alone, because that is what the page
 * shows; a cluster cropped down to one head would be a different picture.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spec = getSpecimen(slug);

  if (!spec) {
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
            alignItems: "center",
            justifyContent: "center",
            fontSize: 64,
          }}
        >
          Flora-Synth
        </div>
      ),
      { ...cardSize, headers: cardHeaders }
    );
  }

  const [fonts, art] = await Promise.all([optionalFonts(), sheetFor(slug)]);
  const seed = [...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rarity = specimenRarity(slug);

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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 560,
            padding: "58px 48px 54px 64px",
          }}
        >
          <Wordmark />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, letterSpacing: 3.4, textTransform: "uppercase", color: "#c99a93" }}>
              {spec.family}
            </div>
            <div style={{ fontSize: 76, lineHeight: 0.96, letterSpacing: -1.2, marginTop: 14, maxWidth: 440 }}>
              {spec.name}
            </div>
            <div style={{ fontSize: 26, marginTop: 12, color: "#e7c2bb", fontStyle: "italic" }}>{spec.latin}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 28,
                fontFamily: "Geist",
                fontSize: 15,
                letterSpacing: 2.6,
                textTransform: "uppercase",
                color: "#c99a93",
              }}
            >
              <div style={{ display: "flex", width: 26, height: 1, background: "#a9803f" }} />
              <div style={{ display: "flex" }}>{spec.origin}</div>
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
              {rarityLabel[rarity]} · {spec.bloom}
            </div>
            <div style={{ display: "flex" }}>
              no. {String(specimens.findIndex((s) => s.slug === slug) + 1).padStart(2, "0")}
            </div>
          </div>
        </div>

        <Panel art={art} ground={groundFor(seed)} />
      </div>
    ),
    {
      ...cardSize,
      ...(fonts ? { fonts } : {}),
      headers: cardHeaders,
    }
  );
}
