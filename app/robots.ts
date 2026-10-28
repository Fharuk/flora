import type { MetadataRoute } from "next";

import { synthSite } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${synthSite.url}/sitemap.xml`,
    host: synthSite.url,
  };
}
