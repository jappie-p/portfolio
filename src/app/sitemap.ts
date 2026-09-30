import type { MetadataRoute } from "next";
import { SITE, BASE_PATH } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const root = `${SITE.url}${BASE_PATH}`;
  return [
    { url: `${root}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${root}/cv/nl`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${root}/cv/en`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
