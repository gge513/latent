import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntryBody } from "@/components/entry-body";
import { getEntry, getEntrySlugs } from "@/lib/entries";
import { siteUrl } from "@/lib/site";

/**
 * One entry, addressable — the programmatic-SEO unit of the broad engine.
 * Same prerender posture as /b/[handle]: build when the database is
 * reachable, fall back to on-demand, tolerate nothing at request time.
 */

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await getEntrySlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.warn(
      "generateStaticParams: database unreachable, rendering /developing/[slug] on demand.",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getEntry(slug);
  if (!entry) return { title: "Not developed · Latent" };
  return {
    title: `${entry.title} · Latent`,
    description: entry.body.split("\n")[0].slice(0, 160),
  };
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getEntry(slug);
  if (!entry) notFound();

  // Structured data for the pSEO unit: crawlers read the entry as an
  // article with a real date and publisher. JSON.stringify escapes the
  // content; nothing user-typed ever reaches an entry body.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.title,
    datePublished: entry.publishedAt.toISOString(),
    url: `${siteUrl}/developing/${entry.slug}`,
    publisher: { "@type": "Organization", name: "Latent" },
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-10 px-6 py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-xs tracking-widest opacity-70">
          {entry.publishedAt.toISOString().slice(0, 10)}
        </span>
        <span className="font-mono text-xs tracking-widest opacity-55">
          {entry.kind}
        </span>
      </div>

      <h1 className="text-3xl leading-relaxed">{entry.title}</h1>

      <EntryBody body={entry.body} />

      {entry.sourceRef && (
        <p className="font-mono text-xs leading-relaxed opacity-55">
          generated from {entry.sourceRef}
        </p>
      )}

      <Link
        href="/developing"
        className="font-mono text-xs tracking-widest opacity-55 underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] underline-offset-4 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
      >
        back to developing
      </Link>
    </main>
  );
}
