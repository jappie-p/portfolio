import type { MetadataRoute } from "next";
import { SITE, BASE_PATH } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE.url}${BASE_PATH}/sitemap.xml`,
  };
}
