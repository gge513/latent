import { getEntries } from "@/lib/entries";
import { siteUrl } from "@/lib/site";

/**
 * RSS for the broad engine: the owned distribution channel nobody can take
 * away. Plain RSS 2.0, revalidated on the same clock as the stream page.
 */

export const revalidate = 300;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  let items = "";
  try {
    const entries = await getEntries();
    items = entries
      .map((e) => {
        const url = `${siteUrl}/developing/${e.slug}`;
        return [
          "<item>",
          `<title>${escapeXml(e.title)}</title>`,
          `<link>${url}</link>`,
          `<guid isPermaLink="true">${url}</guid>`,
          `<pubDate>${e.publishedAt.toUTCString()}</pubDate>`,
          `<description>${escapeXml(e.body)}</description>`,
          "</item>",
        ].join("");
      })
      .join("");
  } catch (err) {
    console.warn(
      "feed.xml: database unreachable, serving an empty feed.",
      err instanceof Error ? err.message : err
    );
  }

  // The stylesheet instruction is for browsers only. Feed readers ignore it
  // and parse the RSS beneath, so this changes nothing about the feed and
  // stops a person who clicks the link being handed raw XML. If a browser
  // does not apply XSLT, they see exactly what they saw before.
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>` +
    `<rss version="2.0"><channel>` +
    `<title>Developing · Latent</title>` +
    `<link>${siteUrl}/developing</link>` +
    `<description>What the builders are shipping, written by the site itself.</description>` +
    items +
    `</channel></rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
