"use client";

/**
 * The single question on the page: I am a ___ looking for a ___
 * The frame tells a partner what to say to the microphone; the blanks are
 * latent until filled, by voice or by typing. The typed inputs ARE the
 * blanks — a peer of the spoken path, equally prominent.
 */
export function SentenceFrame({
  blank1,
  blank2,
  onChange,
  onSubmit,
  disabled,
}: {
  blank1: string;
  blank2: string;
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
      looking for{" "}
      <input
        value={blank2}
        onChange={(e) => onChange(blank1, e.target.value)}
        onKeyDown={keyDown}
        disabled={disabled}
        aria-label="Who you are looking for"
        size={Math.min(28, Math.max(8, blank2.length))}
        className={`${inputClass} ${blank2 ? "opacity-100" : "opacity-[var(--latent)] focus:opacity-100"}`}
      />
    </h1>
  );
}
