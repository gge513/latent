import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";

import { EntryBody } from "@/components/entry-body";
import { getEntries, type Entry } from "@/lib/entries";

/**
 * /developing — the broad engine's one surface (BUILD-PLAN §14). The site
 * writes this page itself: digest entries arrive by cron with no author,
 * spotlights and demo entries by generator, essays only by George's hand.
 *
 * The locks it lives inside: one stream, no dashboard, no per-person counts,
 * entries in the site's own grammar. Informational copy sits on the measured
 * 0.55 floor and develops to full on attention.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Developing · Latent",
  description:
    "The site's own record of what the builders ship, written by the site itself.",
};

function dateOf(e: Entry): string {
  return e.publishedAt.toISOString().slice(0, 10);
}

export default async function Developing() {
  let entries: Entry[] = [];
  try {
    entries = await getEntries();
  } catch (err) {
    console.warn(
      "Developing: database unreachable, rendering an empty stream.",
      err instanceof Error ? err.message : err
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-14 px-6 py-24">
      <header className="flex flex-col gap-4">
        <h1 className="font-mono text-xs tracking-widest opacity-60">
          developing
        </h1>
        <p className="text-2xl leading-relaxed">
          What the builders are shipping, as it happens.
        </p>
        <p className="max-w-md font-mono text-xs leading-relaxed opacity-55">
          This page writes itself from public GitHub, on a daily clock, with no
          author. Follow it by{" "}
          <a
            href="/developing/feed.xml"
            className="underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] underline-offset-4 transition-opacity hover:opacity-100"
          >
            RSS
          </a>
          .
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="font-mono text-xs leading-relaxed opacity-55">
          Nothing here yet. The first entry develops when the first day&apos;s
          work lands.
        </p>
      ) : (
        <ol className="flex flex-col gap-12">
          {entries.map((e) => (
            <li
              key={e.slug}
              className="flex flex-col gap-4 opacity-55 transition-opacity duration-300 focus-within:opacity-100 hover:opacity-100 motion-reduce:transition-none"
            >
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-xs tracking-widest opacity-70">
                  {dateOf(e)}
                </span>
                <span className="font-mono text-xs tracking-widest opacity-55">
                  {e.kind}
                </span>
              </div>
              <h2 className="text-xl leading-relaxed">
                <Link
                  href={`/developing/${e.slug}`}
                  className="transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
                >
                  {e.title}
                </Link>
              </h2>
              <EntryBody body={e.body} />
            </li>
          ))}
        </ol>
      )}
      <SiteFooter current="/developing" />
    </main>
  );
}
