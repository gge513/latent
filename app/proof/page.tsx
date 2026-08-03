import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";

import { getProofCounts } from "@/lib/builders";

/**
 * /proof — one line, developing, on its own page (BUILD-PLAN §9).
 *
 * The locks this page exists inside of:
 *  - Never on the hero. The dashboard was killed in aesthetic step 1, so this
 *    is evidence for a reviewer who goes looking, not decoration.
 *  - Never per-person. Lock 4 killed ranking, and the events table has no
 *    handle column, so a per-person number cannot exist here.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Proof · Latent",
  description: "One line of evidence, counted in aggregate only.",
};

export default async function Proof() {
  // Same build-time tolerance as the home page: if the database is
  // unreachable when this prerenders (a fork, CI without credentials), say so
  // in the page's own voice instead of failing the build. The next
  // revalidation repairs it.
  let counts: Awaited<ReturnType<typeof getProofCounts>> | null = null;
  try {
    counts = await getProofCounts();
  } catch (err) {
    console.warn(
      "Proof: database unreachable, rendering without counts.",
      err instanceof Error ? err.message : err
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-center">
      {/* The page had no h1 at all. The count line below is the subject but it
          is a statistic, not a heading, and the design is deliberately one
          line, so the heading is present for assistive tech and absent to the
          eye. Nothing moves. */}
      <h1 className="sr-only">Proof</h1>
      <p className="develop-once max-w-3xl text-3xl leading-relaxed sm:text-4xl">
        {counts
          ? `${counts.developed} of ${counts.total} developed · ${counts.sent} sent`
          : "The counts will develop when the darkroom reopens."}
      </p>

      <p className="max-w-md font-mono text-xs leading-relaxed opacity-55">
        Developed is a builder who claimed their card. Sent is a message a
        visitor took away to send. Nothing else is counted, and nothing is
        counted per person: the table these come from has no name column.
      </p>
      <SiteFooter current="/proof" />
    </main>
  );
}
