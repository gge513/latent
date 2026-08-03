import { Centerpiece } from "@/components/centerpiece";
import { SiteFooter } from "@/components/site-footer";
import { Space } from "@/components/space";
import { getSpace } from "@/lib/builders";

/**
 * Speak the sentence and the cohort develops. Skip it entirely and the cohort
 * is right there anyway, browsable. The two are the same page because rung 4
 * is not a consolation prize: a visitor must land inside something alive
 * without signing in, without speaking, and without waiting.
 */

export const revalidate = 300;

export default async function Home() {
  // The page is generated at build time and revalidated every five minutes.
  // If the database is unreachable at build — a fork, or CI running the build
  // gate without credentials — render the centerpiece over an empty space
  // rather than failing the build outright. The next revalidation repairs it,
  // so the worst case is five minutes of a thin page instead of a dead deploy.
  // The centerpiece itself reads the database per request, so it is unaffected.
  let builders: Awaited<ReturnType<typeof getSpace>> = [];
  try {
    builders = await getSpace();
  } catch (err) {
    console.warn(
      "Home: database unreachable, rendering an empty space.",
      err instanceof Error ? err.message : err
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center py-24">
      <Centerpiece />

      <div className="mt-24 w-full">
        <Space builders={builders} />
      </div>

      <SiteFooter current="/" />
    </main>
  );
}
