import type { MetadataRoute } from "next";

import { getHandles } from "@/lib/builders";
import { getEntrySlugs } from "@/lib/entries";
import { siteUrl } from "@/lib/site";

/**
 * The sitemap the broad audience arrives through: home, the stream, every
 * builder page, every entry page. Same build tolerance as everything else —
 * an unreachable database yields the static pages rather than a failed build.
 */

// Cached route handler by default; without this it freezes at first-build
// data (caught in the Fri 7/31 local drive: 30 builders and 1 entry on a
// site that had 31 and 5). Same clock as every other data page.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily" },
    { url: `${siteUrl}/developing`, changeFrequency: "daily" },
    { url: `${siteUrl}/proof`, changeFrequency: "daily" },
  ];

  try {
    const [handles, slugs] = await Promise.all([getHandles(), getEntrySlugs()]);
    return [
      ...staticPages,
      ...handles.map((h) => ({
        url: `${siteUrl}/b/${h}`,
        changeFrequency: "weekly" as const,
      })),
      ...slugs.map((s) => ({
        url: `${siteUrl}/developing/${s}`,
        changeFrequency: "monthly" as const,
      })),
    ];
  } catch (err) {
    console.warn(
      "sitemap: database unreachable, serving static pages only.",
      err instanceof Error ? err.message : err
    );
    return staticPages;
  }
}
