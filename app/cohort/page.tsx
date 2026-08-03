import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";

import { getCohortStatus } from "@/lib/cohort";

/**
 * /cohort — read-only cohort project status (`requirements.md`, PM integration).
 *
 * Its own page rather than a panel on /proof, because /proof holds a lock:
 * "one line, developing, on its own page", and a status table on it would be
 * the dashboard that aesthetic step 1 killed.
 *
 * The rule this page keeps: it shows what it read, or it says it could not
 * read. There is no third state where a remembered number appears under a
 * fresh timestamp.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What has shipped · Latent",
  description:
    "What the builders have shipped, counted from merged pull requests.",
};

function whenText(iso: string | null): string {
  if (!iso) return "no merges yet";
  return `last merge ${iso.slice(0, 10)}`;
}

export default async function Cohort() {
  const status = await getCohortStatus();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-10 px-6 py-24">
      <header>
        <h1 className="text-3xl leading-tight">What has shipped</h1>
        <p className="mt-3 leading-relaxed opacity-70">
          What the builders have actually shipped across the three projects,
          counted from merged pull requests in the repository the work lands
          in. Nothing on this page is typed by hand.
        </p>
      </header>

      <section className="flex flex-col gap-5">
        {status.projects.map((p) => (
          <div
            key={p.key}
            className="border-l border-[color-mix(in_srgb,var(--ink)_25%,transparent)] pl-5"
          >
            <p className="text-lg leading-relaxed">{p.title}</p>
            {p.merged === null ? (
              <p className="mt-1 font-mono text-xs tracking-wide opacity-55">
                not checked · the read did not complete
              </p>
            ) : (
              <p className="mt-1 font-mono text-xs tracking-wide opacity-55">
                {p.merged} merged {p.merged === 1 ? "submission" : "submissions"}
                {" · "}
                {whenText(p.latestAt)}
              </p>
            )}
          </div>
        ))}
      </section>

      {!status.complete && (
        <p className="font-mono text-xs leading-relaxed opacity-55">
          At least one branch could not be read just now, and those rows say
          &ldquo;not checked&rdquo; rather than showing a number. A count we did
          not just verify is not a count.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <p className="font-mono text-xs leading-relaxed opacity-55">
          Source: <span className="opacity-100">{status.source}</span>, read
          directly from the GitHub API and refreshed hourly.
        </p>
        <p className="font-mono text-xs leading-relaxed opacity-55">
          The project management tool this work is tracked in is a private
          workspace with no public read surface, so its own board cannot be
          mirrored here without credentials. This reads the record instead:
          the repository the work actually merges into.
        </p>
      </section>
      <SiteFooter current="/cohort" />
    </main>
  );
}
