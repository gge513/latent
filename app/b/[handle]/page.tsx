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

/**
 * Prerender every builder's page when the database is reachable at build time,
 * which is the normal deploy path.
 *
 * When it is not reachable — a fork, or CI running the build gate without
 * credentials — return nothing and let the pages render on demand instead of
 * failing the build. `dynamicParams` is true by default, so the route still
 * works; only the prerendering is skipped.
 *
 * This is deliberately narrow. It swallows a connection failure at BUILD time
 * only. A database failure while serving a request still throws, loudly, which
 * is what it should do.
 */
export async function generateStaticParams() {
  try {
    const handles = await getHandles();
    return handles.map((handle) => ({ handle }));
  } catch (err) {
    console.warn(
      "generateStaticParams: database unreachable, rendering /b/[handle] on demand.",
      err instanceof Error ? err.message : err
    );
    return [];
  }
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
    "One of thirty builders, read from public GitHub.";

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
      {/* A claimed card leads with the name they chose, so the handle above it
          is a label. An unclaimed card has no name, and without this branch the
          page would have no h1 at all — which was true of twenty-nine of the
          thirty. The handle carries the heading in that case. Nothing moves
          visually: the styles are unchanged, only the element. */}
      <header>
        {builder.displayName ? (
          <>
            <p className="font-mono text-xs tracking-widest opacity-55">
              @{builder.handle}
            </p>
            <h1 className="mt-2 text-4xl leading-tight">{builder.displayName}</h1>
          </>
        ) : (
          <h1 className="font-mono text-xs tracking-widest opacity-55">
            @{builder.handle}
          </h1>
        )}
      </header>

      {builder.developedLine ? (
        <section>
          <p className="text-2xl leading-relaxed">{builder.developedLine}</p>
          <p className="mt-3 font-mono text-xs tracking-wide opacity-55">
            in their own words
          </p>
        </section>
      ) : (
        builder.latentLine && (
          <section>
            <p className="text-2xl leading-relaxed opacity-70">
              {builder.latentLine}
            </p>
            <p className="mt-3 font-mono text-xs leading-relaxed tracking-wide opacity-55">
              This card is latent. The line above was read from public GitHub,
              not written by {builder.handle}.
            </p>
            {/* The activation ask. On a latent card this IS the single call to
                action, which is what earns safelight under the palette rule,
                and it gets its own line at full contrast rather than trailing
                a paragraph of explanation. It was the least prominent thing on
                the page and it is the door to the whole loop. */}
            <Link
              href="/claim"
              className="mt-5 inline-block border-b border-transparent font-mono text-sm tracking-widest text-[var(--safelight)] transition-colors hover:border-[var(--safelight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
            >
              Yours? Develop it.
            </Link>
          </section>
        )
      )}

      {builder.vouches.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs tracking-widest opacity-55">
            observed by people who worked alongside them
          </h2>
          {builder.vouches.map((v, i) => (
            <blockquote
              key={i}
              className="border-l border-[color-mix(in_srgb,var(--ink)_25%,transparent)] pl-5"
            >
              <p className="text-lg leading-relaxed">{v.text}</p>
              <cite className="mt-2 block font-mono text-xs not-italic opacity-55">
                @{v.from}
              </cite>
            </blockquote>
          ))}
        </section>
      )}

      {(builder.languages.length > 0 || repos.length > 0) && (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs tracking-widest opacity-55">
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
