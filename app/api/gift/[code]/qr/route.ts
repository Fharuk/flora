import { NextResponse } from "next/server";

import { isCode } from "@/lib/garden";
import { synthSite } from "@/lib/site";
import qr from "qrcode-generator";

/**
 * A QR code for a gift link, drawn here.
 *
 * Sent to a third-party QR service, a gift link — which is the entire secret of the gift —
 * would be handed to somebody else, logged, and possibly cached. So the code is generated
 * on our own server and returned as an SVG: no dependency on a network service, no
 * request that leaves the building, and it stays crisp at any size because it is vector.
 *
 * The gift code is validated first, so this route cannot be used to encode arbitrary
 * URLs under our domain.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isCode(code)) return new NextResponse("Not found", { status: 404 });

  const url = `${synthSite.url}/gift/${code}`;

  const matrix = qr(0, "M");
  matrix.addData(url);
  matrix.make();

  const count = matrix.getModuleCount();
  const quiet = 4;
  const size = count + quiet * 2;

  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (matrix.isDark(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code for gift ${code}">
<rect width="${size}" height="${size}" fill="#ffffff"/>
<path d="${path}" fill="#000000"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // the code is deterministic for a given gift, so it can sit in the CDN
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
