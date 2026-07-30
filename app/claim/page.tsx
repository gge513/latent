import type { Metadata } from "next";
import Link from "next/link";

import { getSession } from "@/auth";
import { getOwnCard } from "@/lib/builders";
import {
  claimCard,
  removeCard,
  restoreCard,
  signInWithGithub,
  signOutOfClaim,
} from "@/lib/claim";

/**
 * /claim — the only authenticated surface (BUILD-PLAN §8), and the moment the
 * spine mechanic turns: an unclaimed card is latent, a claimed card is
 * developed, and this page is where a builder develops their own.
 *
 * Sign-in proves exactly one thing: ownership of the handle. Every state
 * below keys off session.user.login, so the card shown is always and only
 * the visitor's own.
 *
 * Removal is deliberately two steps (?remove=1) but never a browser dialog,
 * and it is immediate and unquestioned once confirmed. Restore exists because
 * consent runs both directions.
 */

export const metadata: Metadata = {
  title: "Claim your card · Latent",
  description: "Develop your own card: your words, your name, your channel.",
};

const label = "font-mono text-xs tracking-widest opacity-55";
const field =
  "w-full border-0 border-b border-b-[color-mix(in_srgb,var(--ink)_40%,transparent)] bg-transparent pb-1 text-lg outline-none focus-visible:border-b-[var(--safelight)]";
const cta =
  "self-start font-mono text-sm tracking-widest text-[var(--safelight)] border-b border-transparent transition-opacity hover:border-[var(--safelight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]";
const quiet =
  "self-start font-mono text-xs tracking-widest opacity-55 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]";

export default async function Claim({
  searchParams,
}: {
  searchParams: Promise<{ remove?: string; removed?: string; empty?: string }>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const login = session?.user?.login ?? null;
  const card = login ? await getOwnCard(login) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-10 px-6 py-24">
      <header>
        <h1 className="text-4xl leading-tight">
          {card && !card.optedOut && card.claimed
            ? "Your card, developed."
            : "Claim your card."}
        </h1>
        <p className="mt-4 max-w-lg font-mono text-xs leading-relaxed opacity-55">
          Every card here starts latent: public GitHub facts and a line a
          machine wrote. Claiming replaces the machine&rsquo;s line with your
          words, and only a message you choose to receive can reach you.
        </p>
      </header>

      {!login && (
        <form action={signInWithGithub} className="flex flex-col gap-4">
          <button type="submit" className={cta}>
            sign in with GitHub
          </button>
          <p className="max-w-lg font-mono text-xs leading-relaxed opacity-55">
            Signing in proves one thing: that the handle is yours. It writes
            nothing until you do.
          </p>
        </form>
      )}

      {login && !card && (
        <section className="flex flex-col gap-4">
          <p className="max-w-lg text-lg leading-relaxed">
            @{login} isn&rsquo;t one of the thirty builders in this space, so
            there is no card here to claim.
          </p>
          <form action={signOutOfClaim}>
            <button type="submit" className={quiet}>
              sign out
            </button>
          </form>
        </section>
      )}

      {login && card && card.optedOut && (
        <section className="flex flex-col gap-4">
          <p className="max-w-lg text-lg leading-relaxed">
            {params.removed
              ? "Done. Your card is gone from the space, effective now."
              : "Your card was removed from the space."}
          </p>
          <form action={restoreCard}>
            <button type="submit" className={quiet}>
              bring it back
            </button>
          </form>
          <form action={signOutOfClaim}>
            <button type="submit" className={quiet}>
              sign out
            </button>
          </form>
        </section>
      )}

      {login && card && !card.optedOut && !params.remove && (
        <form action={claimCard} className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className={label}>@{card.handle}</p>
            {!card.claimed && card.latentLine && (
              <p className="max-w-lg text-lg leading-relaxed opacity-[var(--latent)]">
                {card.latentLine}
              </p>
            )}
            {!card.claimed && (
              <p className="font-mono text-xs leading-relaxed opacity-55">
                the machine&rsquo;s line, currently on your card. Yours
                replaces it.
              </p>
            )}
          </div>

          {params.empty && (
            <p className="font-mono text-xs leading-relaxed text-[var(--safelight)]">
              The line is the claim — it can&rsquo;t be empty.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="line" className={label}>
              your line — what you build, in your words
            </label>
            <input
              id="line"
              name="line"
              required
              maxLength={240}
              defaultValue={card.developedLine ?? ""}
              className={`${field} italic`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="name" className={label}>
              your name, if you want it shown
            </label>
            <input
              id="name"
              name="name"
              maxLength={60}
              defaultValue={card.displayName ?? ""}
              className={field}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contact" className={label}>
              how a visitor may reach you — an email, a LinkedIn, a Cal link
            </label>
            <input
              id="contact"
              name="contact"
              maxLength={120}
              defaultValue={card.contact ?? ""}
              className={field}
            />
            <p className="max-w-lg font-mono text-xs leading-relaxed opacity-55">
              Optional. Leave it empty and visitors are told there is no
              channel — being reachable is your call, not a default.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button type="submit" className={cta}>
              {card.claimed ? "save it" : "develop it"}
            </button>
            <Link href="/claim?remove=1" className={quiet}>
              remove my card entirely
            </Link>
            {/* sign-out lives outside this form (forms cannot nest) and is
                wired to its own action via the form attribute */}
            <button type="submit" form="claim-signout" className={quiet}>
              sign out
            </button>
          </div>
        </form>
      )}

      {login && card && !card.optedOut && !params.remove && (
        <form id="claim-signout" action={signOutOfClaim} />
      )}

      {login && card && !card.optedOut && params.remove && (
        <section className="flex flex-col gap-5">
          <p className="max-w-lg text-lg leading-relaxed">
            Remove @{card.handle} from the space? It takes effect immediately,
            needs no reason, and you can come back here to reverse it.
          </p>
          <div className="flex items-center gap-6">
            <form action={removeCard}>
              <button type="submit" className={cta}>
                remove it
              </button>
            </form>
            <Link href="/claim" className={quiet}>
              keep it
            </Link>
          </div>
        </section>
      )}

      <footer>
        <Link
          href={card && !card.optedOut ? `/b/${card.handle}` : "/"}
          className="font-mono text-xs tracking-widest underline decoration-[color-mix(in_srgb,var(--ink)_30%,transparent)] underline-offset-4 opacity-60 hover:opacity-100"
        >
          {card && !card.optedOut ? "see your card" : "back to the space"}
        </Link>
      </footer>
    </main>
  );
}
