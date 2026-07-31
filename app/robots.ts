import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * The broad audience arrives through crawlers too. Everything public is
 * crawlable; the API spends money or writes and is not a page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
