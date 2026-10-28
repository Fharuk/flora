import type { MetadataRoute } from "next";

import { synthSite } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: synthSite.url, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}
