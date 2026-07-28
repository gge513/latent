import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getBuilder, getHandles } from "@/lib/builders";

/**
 * One builder, developed. This is the page a partner lands on when a card is
 * shared, so it carries the whole consent model on its face:
 *
 *  - latent card  → public GitHub facts + a line marked as machine-derived
 *  - developed card → their own words, in their own name
 *
 * No LLM-invented biography about a named real person is ever published as
 * fact here (BUILD-PLAN §8).
 */

export const revalidate = 300;

export async function generateStaticParams() {
  const handles = await getHandles();
  return handles.map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const builder = await getBuilder(handle);
  if (!builder) return { title: "Not in the space · Latent" };

  const name = builder.displayName ?? `@${builder.handle}`;
  const description =
    builder.developedLine ??
    builder.latentLine ??
    "A builder in the cohort, read from public GitHub.";

  return {
    title: `${name} · Latent`,
    description,
    openGraph: {
      title: name,
      description,
      type: "profile",
      url: `/b/${builder.handle}`,
    },
    twitter: { card: "summary_large_image", title: name, description },
  };
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const builder = await getBuilder(handle);
  if (!builder) notFound();

  const repos = (builder.github?.recentRepos ?? []).slice(0, 4);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-10 px-6 py-24">
      <header>
        <p className="font-mono text-xs tracking-widest opacity-50">
          @{builder.handle}
        </p>
        {builder.displayName && (
          <h1 className="mt-2 text-4xl leading-tight">{builder.displayName}</h1>
        )}
      </header>

      {builder.developedLine ? (
        <section>
          <p className="text-2xl leading-relaxed">{builder.developedLine}</p>
          <p className="mt-3 font-mono text-xs tracking-wide opacity-40">
            in their own words
          </p>
        </section>
      ) : (
        builder.latentLine && (
          <section>
            <p className="text-2xl leading-relaxed opacity-70">
              {builder.latentLine}
            </p>
            {/* The claim flow is Friday's row. No link until the page exists:
                a dead link is worse than a missing one. */}
            <p className="mt-3 font-mono text-xs leading-relaxed tracking-wide opacity-40">
              This card is latent. The line above was read from public GitHub,
              not written by {builder.handle}.
            </p>
          </section>
        )
      )}

      {builder.vouches.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs tracking-widest opacity-50">
            observed by people who worked alongside them
          </h2>
          {builder.vouches.map((v, i) => (
            <blockquote
              key={i}
              className="border-l border-[color-mix(in_srgb,var(--ink)_25%,transparent)] pl-5"
            >
              <p className="text-lg leading-relaxed">{v.text}</p>
              <cite className="mt-2 block font-mono text-xs not-italic opacity-50">
                @{v.from}
              </cite>
            </blockquote>
          ))}
        </section>
      )}

      {(builder.languages.length > 0 || repos.length > 0) && (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs tracking-widest opacity-50">
            what is public on GitHub
          </h2>
          {builder.languages.length > 0 && (
            <p className="font-mono text-sm opacity-70">
              {builder.languages.join(" · ")}
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {repos.map((r) => (
              <li key={r.name}>
                <a
                  href={`https://github.com/${builder.handle}/${r.name}`}
                  className="font-mono text-sm underline decoration-[color-mix(in_srgb,var(--ink)_30%,transparent)] underline-offset-4 hover:decoration-[var(--safelight)]"
                >
                  {r.name}
                </a>
                {r.description && (
                  <span className="ml-2 text-sm opacity-60">{r.description}</span>
                )}
                {r.homepage && (
                  <a
                    href={r.homepage}
                    className="ml-2 font-mono text-xs text-[var(--safelight)] underline underline-offset-4"
                  >
                    live
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-6">
        <Link
          href="/"
          className="font-mono text-xs tracking-widest underline decoration-[color-mix(in_srgb,var(--ink)_30%,transparent)] underline-offset-4 opacity-60 hover:opacity-100"
        >
          back to the space
        </Link>
      </footer>
    </main>
  );
}
