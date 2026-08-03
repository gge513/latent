import Link from "next/link";

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

const linkClass =
  "opacity-55 underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] underline-offset-4 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]";

export function SiteFooter({ current }: { current: string }) {
  const doors = DOORS.filter((d) => d.href !== current);

  return (
    <footer className="mt-8 flex flex-col items-center gap-3">
      <p className="font-mono text-sm tracking-widest">
        <span aria-hidden="true" className="opacity-[var(--latent)]">
          latent ·{" "}
        </span>
        {current === "/developing" ? (
          <span className="opacity-55">developing</span>
        ) : (
          <Link href="/developing" className={linkClass}>
            developing
          </Link>
        )}
      </p>

      <nav
        aria-label="More"
        className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-xs tracking-widest"
      >
        {doors.map((d) => (
          <Link key={d.href} href={d.href} className={linkClass}>
            {d.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
