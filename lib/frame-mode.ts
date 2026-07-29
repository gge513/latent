/**
 * J7 — the third blank the site owns.
 *
 * The connective between the two blanks adapts to who the visitor says they
 * are. Someone building says "looking to build"; someone hiring on another
 * team's behalf says "looking for someone to build". The second blank always
 * holds THE WORK either way, so the matcher receives a job description on
 * both paths.
 *
 * Guardrails this file exists to honour:
 *  - Local keyword test, never a model call. Nothing fires on a keystroke.
 *  - Two modes only.
 *  - Whole-word matching, so a partially typed word can never swap the
 *    sentence. `detectMode` returns null when it recognises nothing, and the
 *    caller holds the last decided mode — so typing "talented" past "talent"
 *    does not flicker back.
 */

export type FrameMode = "build" | "source";

/** The default a stranger gets. Building is the wider door. */
export const DEFAULT_MODE: FrameMode = "build";

export const CONNECTIVE: Record<FrameMode, string> = {
  build: "looking to build",
  source: "looking for someone to build",
};

/**
 * Source mode only. Every entry names hiring on someone else's behalf as the
 * job itself — never a founder or operator who happens to be hiring.
 * PROVISIONAL: this list decides which sentence a stranger gets, and George
 * has not ratified it.
 */
const SOURCE_TERMS = [
  "recruiter",
  "recruiters",
  "recruiting",
  "recruitment",
  "sourcer",
  "sourcers",
  "sourcing",
  "headhunter",
  "headhunters",
  "staffing",
  "hr",
  "talent acquisition",
  "head of talent",
  "talent partner",
  "talent lead",
  "hiring manager",
  "hiring lead",
];

/**
 * The mode the text names, or null for "undecided — hold what you have".
 *
 * Null is returned only while the tail of the text is still growing into a
 * term: "talent" on its way to "talent acquisition". That is the one case
 * where deciding would flicker the sentence mid-word. Everything else gets a
 * real answer, so the mode stays fully reversible — delete "recruiter", type
 * "founder", and the sentence goes back.
 */
export function detectMode(text: string): FrameMode | null {
  const norm = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (norm === "") return null;
  if (SOURCE_TERMS.some((term) => ` ${norm} `.includes(` ${term} `))) {
    return "source";
  }
  // Mid-word: the last word (or last few) is a strict prefix of a term.
  if (/[a-z0-9]$/i.test(text)) {
    const tokens = norm.split(" ");
    for (let take = 1; take <= Math.min(3, tokens.length); take++) {
      const tail = tokens.slice(tokens.length - take).join(" ");
      if (SOURCE_TERMS.some((term) => term !== tail && term.startsWith(tail))) {
        return null;
      }
    }
  }
  return "build";
}

/**
 * Splits a spoken or typed sentence into the two blanks, accepting every
 * connective form. Longest form first: "looking for someone to build" must be
 * tried before "looking for", or the second blank keeps the words
 * "someone to build".
 */
const CONNECTIVE_PATTERNS: { re: RegExp; mode: FrameMode | null }[] = [
  { re: /\blooking\s+for\s+someone\s+(?:who\s+can\s+build|to\s+build)\s+/i, mode: "source" },
  { re: /\blooking\s+to\s+(?:build|get)\s+/i, mode: "build" },
  { re: /\btrying\s+to\s+build\s+/i, mode: "build" },
  { re: /\blooking\s+for\s+someone\s+who\s+can\s+/i, mode: "source" },
  { re: /\blooking\s+for\s+/i, mode: null },
  { re: /\bwho\s+can\s+build\s+/i, mode: "source" },
];

export function parseSentence(text: string): {
  blank1: string;
  blank2: string;
  mode: FrameMode | null;
} {
  const cleaned = text.replace(/^\s*(i\s*am|i'm)\s+(a|an)?\s*/i, "");
  for (const { re, mode } of CONNECTIVE_PATTERNS) {
    const m = re.exec(cleaned);
    if (m) {
      return {
        blank1: cleaned.slice(0, m.index).trim(),
        blank2: cleaned.slice(m.index + m[0].length).trim(),
        mode: mode ?? detectMode(cleaned.slice(0, m.index)),
      };
    }
  }
  return { blank1: cleaned.trim(), blank2: "", mode: detectMode(cleaned) };
}

/** The sentence as the matcher receives it. */
export function composeSentence(
  blank1: string,
  blank2: string,
  mode: FrameMode
): string {
  return `I am a ${blank1.trim()} ${CONNECTIVE[mode]} ${blank2.trim()}`;
}
