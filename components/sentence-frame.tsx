"use client";

import { CONNECTIVE, type FrameMode } from "@/lib/frame-mode";

/**
 * The single question on the page: I am a ___ [connective] ___
 * The frame tells a partner what to say to the microphone; the blanks are
 * latent until filled, by voice or by typing. The typed inputs ARE the
 * blanks — a peer of the spoken path, equally prominent.
 *
 * The connective is the third blank, and the site owns it (J7). It is not an
 * input: it changes itself in response to the first blank, which is the whole
 * point. It crossfades rather than cutting, and it never touches blank 2.
 */
export function SentenceFrame({
  blank1,
  blank2,
  mode,
  onChange,
  onSubmit,
  disabled,
}: {
  blank1: string;
  blank2: string;
  mode: FrameMode;
  onChange: (blank1: string, blank2: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  function keyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && (blank1.trim() || blank2.trim())) {
      e.preventDefault();
      onSubmit();
    }
  }

  // The blank is the input's own bottom border — no placeholder text, so the
  // line never doubles. Latent when empty, developed when filled or focused.
  const inputClass =
    "inline-block border-0 border-b bg-transparent text-center font-[inherit] text-[inherit] italic outline-none transition-opacity duration-500 border-b-[color-mix(in_srgb,var(--ink)_40%,transparent)] focus-visible:border-b-[var(--safelight)]";

  return (
    <h1 className="max-w-3xl text-center text-4xl leading-relaxed sm:text-5xl sm:leading-relaxed">
      I am a{" "}
      <input
        value={blank1}
        onChange={(e) => onChange(e.target.value, blank2)}
        onKeyDown={keyDown}
        disabled={disabled}
        aria-label="Who you are"
        size={Math.min(24, Math.max(8, blank1.length))}
        className={`${inputClass} ${blank1 ? "opacity-100" : "opacity-[var(--latent)] focus:opacity-100"}`}
      />{" "}
      {/* Keyed on the mode, so React replaces the node and the new words
          develop in. No state, no timer: the animation is the swap. */}
      <span key={mode} aria-live="polite" className="connective">
        {CONNECTIVE[mode]}
      </span>{" "}
      <input
        value={blank2}
        onChange={(e) => onChange(blank1, e.target.value)}
        onKeyDown={keyDown}
        disabled={disabled}
        aria-label="What you want built"
        size={Math.min(28, Math.max(8, blank2.length))}
        className={`${inputClass} ${blank2 ? "opacity-100" : "opacity-[var(--latent)] focus:opacity-100"}`}
      />
    </h1>
  );
}
