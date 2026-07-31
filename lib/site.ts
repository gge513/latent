/**
 * One place for the canonical site URL. metadataBase, the RSS feed and the
 * sitemap all need absolute URLs, and they must agree.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://latent-nu.vercel.app";
