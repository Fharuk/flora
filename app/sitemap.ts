import type { MetadataRoute } from "next";

import { specimens } from "@/lib/specimens";
import { synthSite } from "@/lib/site";

/**
 * The film owns `/`; the instrument's surfaces are real routes of their own.
 * They were in the nav long before they were in this list, which meant search
 * engines only ever saw the front door.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: synthSite.url, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${synthSite.url}/compose`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${synthSite.url}/studio`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    /* the gift flow: the one route with a commercial intent behind it */
    { url: `${synthSite.url}/send`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${synthSite.url}/collection`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${synthSite.url}/plot`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    /* one page per specimen: eleven entry points into the collection, not one */
    ...specimens.map((s) => ({
      url: `${synthSite.url}/specimen/${s.slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
