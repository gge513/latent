import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";

import { getProofCounts } from "@/lib/builders";

/**
 * /partners — the mandatory partner surface (`requirements.md`).
 *
 * Two rules this page keeps, and both cost it something.
 *
 * It states no commercial terms of its own. The referral fee belongs to the
 * program that runs the summer, not to this site, and inventing a fee model
 * here would be asserting an arrangement nobody has agreed to. It points at
 * the program instead and says plainly that this site takes nothing.
 *
 * And it reads its reachability numbers live rather than stating them. The
 * honest fact is uncomfortable: most cards are unclaimed and those people
 * cannot be reached through here. Writing that as prose would go stale the
 * moment someone claims, which is exactly the failure that put "thirty" in
 * copy while the space held 31. A number that is read cannot drift.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "For partners · Latent",
  description:
    "How to find someone here, who you can reach, and what it costs.",
};

export default async function Partners() {
  // Same build-time tolerance as the other database-backed pages: if the read
  // fails, say so in the page's own voice rather than printing a number we
  // did not just verify.
  let counts: Awaited<ReturnType<typeof getProofCounts>> | null = null;
  try {
    counts = await getProofCounts();
  } catch (err) {
    console.warn(
      "Partners: database unreachable, rendering without counts.",
      err instanceof Error ? err.message : err
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-10 px-6 py-24">
      <header>
        <h1 className="text-3xl leading-tight">For partners</h1>
        <p className="mt-3 leading-relaxed opacity-70">
          Thirty-one builders spent the summer shipping real products. This is
          how you find the ones closest to what you are trying to do, what it
          costs, and who you can actually reach.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest opacity-55">
          how to find someone
        </h2>
        <p className="leading-relaxed">
          Say one sentence about what your team is trying to build. You get the
          two or three people whose public work sits closest to it, each with a
          written reason grounded in what they have actually shipped. Then you
          pick one, and the site hands you a finished message to send.
        </p>
        <p className="leading-relaxed opacity-70">
          There is no account, no form in the way, and no ranking anywhere.
          Distance between two people means only that they work on similar
          things. Nobody is above anybody.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest opacity-55">
          who you can reach today
        </h2>
        {counts ? (
          <p className="leading-relaxed">
            <span className="font-mono">
              {counts.developed} of {counts.total}
            </span>{" "}
            builders {counts.developed === 1 ? "has" : "have"} developed a card,
            which means they have written their own line and chosen how to be
            contacted. The rest are latent: their
            page shows public facts about their work and a line marked as
            machine-written, and there is no contact channel on it.
          </p>
        ) : (
          <p className="leading-relaxed">
            The count will develop when the darkroom reopens.
          </p>
        )}
        <p className="leading-relaxed opacity-70">
          That is a design decision, not a gap being fixed. Being reachable is
          something a person opts into here, and nobody is listed as available
          on their behalf. If the person you want is latent, the honest answer
          is that this site will not hand you their inbox. It will show you
          their work, and you can reach them the way anyone else would.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest opacity-55">
          what it costs
        </h2>
        <p className="leading-relaxed">
          Nothing, and this site takes no fee of any kind. It is not a staffing
          agency and it holds no agreement with anyone on it.
        </p>
        <p className="leading-relaxed opacity-70">
          The summer program these builders came through runs its own hiring
          arrangement with employers, including its own fee. That is the
          program&rsquo;s to state and not this site&rsquo;s, so you will not
          find terms invented here. Ask the program directly.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest opacity-55">
          what happens to what you type
        </h2>
        <p className="leading-relaxed">
          Nothing is stored. Not the sentence you say, not the audio, not the
          transcript, not the message you take away. The only thing recorded is
          a count that a match happened, and the table it lands in has no column
          for a name, so a record of you cannot exist here even by accident.
        </p>
      </section>
      <SiteFooter current="/partners" />
    </main>
  );
}
