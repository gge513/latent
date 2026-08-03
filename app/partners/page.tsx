import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";

import { IntroRequest } from "@/components/intro-request";
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
          how you meet the ones closest to what you are trying to do.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest opacity-55">
          how to find someone
        </h2>
        <p className="leading-relaxed">
          Say one sentence about what your team is trying to build. You get the
          two or three people whose public work sits closest to it, each with a
          written reason grounded in what they have shipped. You pick one, and
          the site hands you a finished message to send.
        </p>
        <p className="leading-relaxed opacity-70">
          There is no account, nothing to fill in first, and no ranking.
          Distance between two people means only that they work on similar
          things. Nobody is above anybody.
        </p>
      </section>

      {/* Placement only, 2026-08-03. Every load-bearing sentence below is
          George's, moved rather than written. Provenance:

            para 1  DOCTRINE §1.1, verbatim.
            para 2  DOCTRINE §7.2 (the darkroom quote) verbatim; "latent until
                    they develop" verbatim; "develop out of the dark" and "the
                    buyer is the photographer" from the shipped README. Person
                    shifted to second, since this page addresses the reader.
            para 3  DOCTRINE §1.3, verbatim, including "valuable twice".
            closer  DOCTRINE §1.1 guardrail, verbatim.

          The joins are the only new words. §7.2 is why the two ideas sit in
          one section: latent-and-developing is not a second concept beside
          proximity, it is "proximity stated as a physical process".

          It sits above "who you can reach today" deliberately. With the
          guardrail already said, the low claim count reads as the design
          working rather than as a directory apologising for being empty. */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest opacity-55">
          why this is not a directory
        </h2>
        <p className="leading-relaxed">
          The sharing economy surfaced latent physical capacity: idle cars,
          empty rooms, unused manufacturing lines. It did not create supply, it
          made existing supply reachable. The frontier version is latent human
          capacity: skill that exists but is not visible or reachable.
        </p>
        <p className="leading-relaxed">
          When we think of things that develop it is relationships, working
          styles, just like film. They are latent until they develop. So you
          are not shopping a directory. You say what you are trying to do, and
          the builders closest to that work develop out of the dark. You are
          the photographer here.
        </p>
        <p className="leading-relaxed">
          Everyone has someone that is just ahead of them in knowledge and
          ability, enabling them not only to get the job done for them but
          bring them along. That person is valuable twice: they do the thing,
          and they pull you up behind them.
        </p>
        <p className="leading-relaxed opacity-70">
          The skill is latent. The person is not idle.
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
            builders {counts.developed === 1 ? "has" : "have"} developed a card:
            written their own line, chosen how to be reached. The rest are
            latent. Their page shows public facts and a line marked as
            machine-written, and carries no contact channel.
          </p>
        ) : (
          <p className="leading-relaxed">
            The count will develop when the darkroom reopens.
          </p>
        )}
        <p className="leading-relaxed opacity-70">
          If the person you want is latent, this site will not hand you their
          inbox. It will show you their work, and you can reach them the way
          anyone else would.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest opacity-55">
          what it costs
        </h2>
        <p className="leading-relaxed">
          Nothing. This site takes no fee, is not a staffing agency, and holds
          no agreement with anyone on it.
        </p>
        <p className="leading-relaxed opacity-70">
          The summer program these builders came through has its own
          arrangement with employers, including its own fee. Those terms are
          the program&rsquo;s to state, not ours. Ask them directly.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs tracking-widest opacity-55">
          ask for an introduction
        </h2>
        <p className="leading-relaxed opacity-70">
          This writes the message for you. You send it yourself, from your own
          mail, and nothing here reaches anyone until you do.
        </p>
        {/* The address is an environment value, never a literal. A personal
            address hardcoded as a fallback ships in the repo and becomes the
            live value the moment the variable is unset, which is a mistake I
            reviewed on a peer's build this week. Unset here means the form
            still composes and simply offers no mail door. */}
        <IntroRequest to={process.env.INTRO_EMAIL ?? null} />
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
