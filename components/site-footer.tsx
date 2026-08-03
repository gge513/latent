import Link from "next/link";
import { Fragment } from "react";

/**
 * The site footer: two rows, deliberately, because they are two different
 * objects that were previously fighting inside one element.
 *
 * Row one is **the signature**. "latent · developing" is not navigation, it is
 * the product's two card states used as a sign-off, with `latent` decorative
 * and one word carrying a link. It holds exactly one job and a third item
 * would turn a pun into a nav bar wearing a pun's clothes (George's ruling,
 * 2026-08-03).
 *
 * Row two is **the doors**, and it exists because `/partners` is not an
 * evidence surface. `/proof` and `/cohort` are: §4.5 says evidence lives
 * deeper as the asker gets further in, and their depth is correct. But a
 * hiring partner does not earn their way to the page explaining how to hire.
 * They arrive looking for it, and it was three clicks down behind two evidence
 * pages. Depth was the defect.
 *
 * Why a footer rather than a header: a header is the landing-page move the
 * "land inside something alive" lock exists to prevent. A footer is the
 * deepest layer of the same ladder, and it competes with nothing.
 *
 * The current page is never linked to itself: pass `current`.
 */

const DOORS = [
  { href: "/", label: "find someone" },
  { href: "/partners", label: "for partners" },
  { href: "/cohort", label: "what has shipped" },
  { href: "/proof", label: "proof" },
] as const;

/** The signature's one link keeps its underline: it is the primary row. */
const signatureClass =
  "opacity-55 underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] underline-offset-4 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]";

/**
 * The doors carry no resting underline. Four permanent underlines was most of
 * the visual weight in this block, and the rule arrives on attention instead.
 *
 * They stay at opacity-55 rather than dropping to --latent, which is what the
 * site's own grammar would otherwise ask for. Measured: ink at 0.55 over base
 * is 5.18:1 and clears the 4.5:1 floor for small text; --latent (0.28) is
 * 2.25:1 and fails it. That is why opacity-55 recurs across this codebase.
 * It is the contrast floor, not a taste.
 */
const doorClass =
  "opacity-55 underline-offset-4 decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] transition-opacity hover:underline hover:opacity-100 focus-visible:underline focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]";

export function SiteFooter({ current }: { current: string }) {
  const doors = DOORS.filter((d) => d.href !== current);

  return (
    <footer className="mt-16 flex flex-col items-center gap-3">
      <p className="font-mono text-sm tracking-widest">
        <span aria-hidden="true" className="opacity-[var(--latent)]">
          latent ·{" "}
        </span>
        {current === "/developing" ? (
          <span className="opacity-55">developing</span>
        ) : (
          <Link href="/developing" className={signatureClass}>
            developing
          </Link>
        )}
      </p>

      {/* Separated by the site's own "·" rather than by gaps, so the row
          reads as one line in the same grammar as the signature above it
          instead of three floating items. Inline rather than flex so it wraps
          like text on a narrow screen. The separator is decorative and
          aria-hidden, so it may sit at --latent where the links may not. */}
      <nav
        aria-label="More"
        className="text-center font-mono text-xs leading-relaxed tracking-widest"
      >
        {doors.map((d, i) => (
          <Fragment key={d.href}>
            {i > 0 && (
              <span aria-hidden="true" className="opacity-[var(--latent)]">
                {" · "}
              </span>
            )}
            <Link href={d.href} className={doorClass}>
              {d.label}
            </Link>
          </Fragment>
        ))}
      </nav>
    </footer>
  );
}
