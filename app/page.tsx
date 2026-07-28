import { Centerpiece } from "@/components/centerpiece";
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
  const builders = await getSpace();

  return (
    <main className="flex min-h-screen flex-col items-center py-24">
      <Centerpiece />

      <div className="mt-24 w-full">
        <Space builders={builders} />
      </div>

      <p className="mt-8 font-mono text-sm tracking-widest opacity-[var(--latent)]">
        latent · developing
      </p>
    </main>
  );
}
