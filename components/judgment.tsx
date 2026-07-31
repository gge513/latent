"use client";

import { useRef, useState } from "react";

import { countEvent } from "@/lib/count";

/**
 * The judgment moment (J1, J3).
 *
 * The credential this site trades on is taste, and the taste that matters is
 * the visitor's. So the site does not claim to have picked correctly: it hands
 * them a moment to exercise their own judgment, and their choice is the only
 * ungenerated sentence in the whole flow.
 *
 * Two rules shape everything here:
 *  - The reason is SKIPPABLE, NOT OPTIONAL. Skipping is one visible click, not
 *    a thing you accomplish by ignoring the form. Nobody is trapped behind a
 *    box they did not want to fill in.
 *  - Never make a person compose. Their words are handed back to them inside a
 *    finished message, so the work left to do is send it, not write it.
 *
 * Nothing here is persisted. The reason never leaves the browser: the only
 * thing that reaches the server is a handle-less count.
 */
export function Judgment({
  handle,
  name,
  claimed,
  contact,
  sentence,
}: {
  handle: string;
  name: string | null;
  claimed: boolean;
  contact: string | null;
  sentence: string;
}) {
  const [reason, setReason] = useState("");
  const [settled, setSettled] = useState(false);
  const [taken, setTaken] = useState<"no" | "copied" | "selected">("no");
  const messageRef = useRef<HTMLParagraphElement>(null);

  const who = name ? `${name} (@${handle})` : `@${handle}`;
  const because = reason.trim()
    ? ` I picked you because ${reason.trim().replace(/\.$/, "")}.`
    : "";
  const message =
    `Hi ${name ?? `@${handle}`}, I found you through Latent, ` +
    `where your work is shown as it stands. ` +
    `${sentence}.${because} ` +
    `Would you be open to a short conversation about it?`;

  /**
   * The clipboard is not guaranteed. It needs a secure context, a live user
   * gesture and a focused document, and any of the three can be missing. A
   * button that silently does nothing is the worst outcome, so the refusal has
   * a designed answer: select the message so the visitor's own copy shortcut
   * finishes the job, and say which of the two happened.
   */
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
    countEvent("share");
  }

  if (!settled) {
    return (
      <div className="mt-6 flex flex-col gap-3 border-l border-[var(--safelight)] py-1 pl-6">
        <label
          htmlFor="why"
          className="font-mono text-xs tracking-widest opacity-60"
        >
          why {who}?
        </label>
        <input
          id="why"
          value={reason}
          autoFocus
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setSettled(true);
            }
          }}
          maxLength={200}
          className="w-full max-w-xl border-0 border-b border-b-[color-mix(in_srgb,var(--ink)_40%,transparent)] bg-transparent pb-1 text-xl italic leading-relaxed outline-none focus-visible:border-b-[var(--safelight)]"
        />
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setSettled(true)}
            className="font-mono text-xs tracking-widest text-[var(--safelight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
          >
            {reason.trim() ? "that's why" : "write the message"}
          </button>
          {reason.trim() && (
            <button
              type="button"
              onClick={() => {
                setReason("");
                setSettled(true);
              }}
              className="font-mono text-xs tracking-widest opacity-55 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
            >
              skip
            </button>
          )}
        </div>
        <p className="font-mono text-xs leading-relaxed opacity-55">
          One line, in your own words. It stays in this browser and is never
          sent to us.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3 border-l border-[var(--safelight)] py-1 pl-6">
      <p className="font-mono text-xs tracking-widest opacity-60">
        your message, ready to send
      </p>
      <p ref={messageRef} className="max-w-xl text-lg leading-relaxed">
        {message}
      </p>

      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={take}
          className="font-mono text-xs tracking-widest text-[var(--safelight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
        >
          {taken === "copied"
            ? "copied"
            : taken === "selected"
              ? "selected · press copy"
              : "copy it"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSettled(false);
            setTaken("no");
          }}
          className="font-mono text-xs tracking-widest opacity-55 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
        >
          change what you said
        </button>
      </div>

      {/* Reachability is the reward for claiming. We never guess at a way to
          reach someone who has not offered one. */}
      <p className="max-w-xl font-mono text-xs leading-relaxed opacity-55">
        {claimed && contact
          ? `Reach them at ${contact}.`
          : `${name ?? `@${handle}`} has not claimed this card yet, so there is no channel here to send it through. Their GitHub profile is on their page.`}
      </p>
    </div>
  );
}
