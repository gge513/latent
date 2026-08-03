"use client";

import { useRef, useState } from "react";

/**
 * The intro request (`requirements.md`: partner name, company, student(s),
 * message). It composes and hands over. It does not send, and it does not
 * store.
 *
 * **Why compose-and-hand-over.** This site's promise is that nothing a visitor
 * types is kept, and `/partners` states it without qualification. The promise
 * is about storage rather than transmission, so a server-side send would also
 * have honoured it, but that needs an email provider this repo does not have.
 * Until it does, the honest version is the move the site already makes when it
 * hands you a finished message after a match: write it for you, give it to
 * you, and let you send it. See EVENT-BUILD.md, "deferred", for the upgrade.
 *
 * **The gap this leaves, stated rather than hidden.** `requirements.md` wants
 * the form to *notify* within a minute. This notifies nobody. The page says so
 * in plain words instead of implying delivery, because a success message over
 * an unsent request is worse than an honest hand-off, and that exact defect is
 * one I found in two peer builds this week.
 *
 * **The clipboard is not guaranteed**, so the composed message is always
 * rendered on the page first and the copy button is an optimisation over it.
 * A button whose only paths lead somewhere unavailable is how an export ships
 * broken twice, which is a lesson this project paid for.
 */

const FIELD =
  "w-full border-0 border-b border-b-[color-mix(in_srgb,var(--ink)_40%,transparent)] bg-transparent py-1 outline-none transition-colors focus-visible:border-b-[var(--safelight)]";
const LABEL = "font-mono text-xs tracking-widest opacity-60";

export function IntroRequest({ to }: { to: string | null }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [who, setWho] = useState("");
  const [need, setNeed] = useState("");
  const [composed, setComposed] = useState(false);
  const [taken, setTaken] = useState<"no" | "copied" | "selected">("no");
  const messageRef = useRef<HTMLParagraphElement>(null);

  const ready = name.trim() && need.trim();

  const message = [
    `Hello,`,
    ``,
    `I am ${name.trim()}${company.trim() ? ` at ${company.trim()}` : ""}.`,
    who.trim()
      ? `I would like an introduction to ${who.trim()}.`
      : `I would like an introduction to someone from this group.`,
    ``,
    need.trim(),
    ``,
    `Found via Latent.`,
  ].join("\n");

  const mailto =
    `mailto:${to ?? ""}` +
    `?subject=${encodeURIComponent("Introduction request via Latent")}` +
    `&body=${encodeURIComponent(message)}`;

  async function take() {
    try {
      await navigator.clipboard.writeText(message);
      setTaken("copied");
    } catch {
      const node = messageRef.current;
      const selection = window.getSelection();
      if (node && selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setTaken("selected");
    }
  }

  if (composed) {
    return (
      <div className="flex flex-col gap-4 border-l border-[var(--safelight)] py-1 pl-6">
        <p className={LABEL}>your message, ready to send</p>
        <p
          ref={messageRef}
          className="whitespace-pre-wrap leading-relaxed"
        >
          {message}
        </p>
        <div className="flex flex-wrap items-center gap-5 font-mono text-xs tracking-widest">
          <button
            type="button"
            onClick={take}
            className="underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] underline-offset-4 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
          >
            copy it
          </button>
          {to && (
            <a
              href={mailto}
              className="text-[var(--safelight)] underline underline-offset-4"
            >
              open in email
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setComposed(false);
              setTaken("no");
            }}
            className="opacity-60 underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] underline-offset-4 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
          >
            change it
          </button>
          <span aria-live="polite" className="opacity-55">
            {taken === "copied"
              ? "copied"
              : taken === "selected"
                ? "selected, press copy"
                : ""}
          </span>
        </div>
        <p className="font-mono text-xs leading-relaxed opacity-55">
          Nothing here was sent and nothing was stored. The message is yours to
          send{to ? "" : ", to whichever address you already have"}. This site
          does not deliver it for you, and it will not tell you that it did.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) setComposed(true);
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="intro-name" className={LABEL}>
          your name
        </label>
        <input
          id="intro-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="intro-company" className={LABEL}>
          your company
        </label>
        <input
          id="intro-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="intro-who" className={LABEL}>
          who you want to meet, if you know
        </label>
        <input
          id="intro-who"
          value={who}
          onChange={(e) => setWho(e.target.value)}
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="intro-need" className={LABEL}>
          what you are trying to do
        </label>
        <textarea
          id="intro-need"
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          required
          rows={3}
          className={`${FIELD} resize-none`}
        />
      </div>
      <button
        type="submit"
        disabled={!ready}
        className="self-start font-mono text-xs tracking-widest text-[var(--safelight)] underline underline-offset-4 transition-opacity disabled:opacity-[var(--latent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
      >
        write it for me
      </button>
    </form>
  );
}
