import type { GithubFacts } from "@/lib/github";

/**
 * The explained matcher, ported from Tavern and repointed: builder↔builder
 * becomes partner↔builder. Deterministic candidate scoring narrows the pool,
 * then one AI call (sonnet, streamed by the route) writes the plain-language
 * "why this person is just ahead of you". Keyword explanations are the rung-3
 * fallback when the API is down — degrading is allowed, a spinner is not.
 */

export type BuilderForMatching = {
  handle: string;
  displayName: string | null;
  github: GithubFacts | null;
  latentLine: string | null;
  developedLine: string | null;
  vouches: string[];
};

const STOP = new Set([
  "a", "an", "and", "are", "for", "i", "in", "is", "it", "my", "of", "on",
  "or", "our", "the", "to", "we", "with", "am", "looking", "want", "need",
  "someone", "who", "can", "help", "team", "trying", "do", "build",
]);

export function tokenize(input: string): string[] {
  return [
    ...new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9.+#-]+/)
        .filter((t) => t.length > 1 && !STOP.has(t))
    ),
  ];
}

type Scored = {
  builder: BuilderForMatching;
  score: number;
  matched: string[];
};

function haystacks(b: BuilderForMatching): { text: string; weight: number }[] {
  const g = b.github;
  return [
    { text: (g?.languages ?? []).join(" "), weight: 4 },
    { text: (g?.topics ?? []).join(" "), weight: 3 },
    {
      text: (g?.recentRepos ?? [])
        .map((r) => `${r.name} ${r.description ?? ""}`)
        .join(" "),
      weight: 2,
    },
    { text: b.developedLine ?? "", weight: 3 },
    { text: b.latentLine ?? "", weight: 1 },
    { text: b.vouches.join(" "), weight: 2 },
  ];
}

/** Deterministic narrowing. Returns every builder that matched at all, best first. */
export function rankCandidates(query: string, pool: BuilderForMatching[]): Scored[] {
  const terms = tokenize(query);
  return pool
    .map((builder) => {
      let score = 0;
      const matched: string[] = [];
      for (const { text, weight } of haystacks(builder)) {
        const lower = text.toLowerCase();
        for (const t of terms) {
          if (lower.includes(t)) {
            score += weight;
            if (!matched.includes(t)) matched.push(t);
          }
        }
      }
      return { builder, score, matched };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

export type Match = {
  handle: string;
  displayName: string | null;
  explanation: string;
};

/**
 * Rung 3: keyword matches with plainly labelled simpler explanations.
 * Built only from facts we hold — matched terms and public activity.
 */
export function keywordMatches(query: string, pool: BuilderForMatching[]): Match[] {
  return rankCandidates(query, pool)
    .slice(0, 3)
    .map(({ builder, matched }) => ({
      handle: builder.handle,
      displayName: builder.displayName,
      explanation:
        `Matched on ${matched.slice(0, 4).join(", ")}. ` +
        `This is the simple match: their public work overlaps with what you said. ` +
        `The written explanation is offline right now.`,
    }));
}

/** How many candidates the AI call sees. Kept small: the call must feel instant. */
export const MATCH_CANDIDATES = 6;

export const MATCH_SYSTEM = `You write match explanations for Latent, a site where a hiring partner speaks one sentence about what their team is trying to do and meets the two or three cohort builders just ahead of them: people who both do this work and bring others along.

You are given the partner's sentence and a shortlist of builders with public GitHub evidence, their own words (if they have claimed their card), and peer observations. Pick the two or three genuinely closest matches and for each write 1-2 plain sentences on why this person is just ahead of what the partner described.

Hard rules:
- Ground every claim in the evidence given. Hedge anything inferred ("their public work suggests..."). Never invent skills, projects, or personality.
- Prefer the builder's own words and peer observations over machine inference.
- No rankings, no scores, no comparisons between the picked builders.
- Never disparage anyone, including builders you do not pick.
- Plain language a non-engineer reads without translation. No unexplained technical nouns.
- Suggestions, never verdicts. Dry, warm, adult tone. No exclamation marks, no emoji.

Output format, exactly: for each chosen builder, one line containing only their @handle, then the explanation on the following line(s), then one blank line. No preamble, no closing remarks, no other text.`;

export function matchPrompt(query: string, candidates: BuilderForMatching[]): string {
  const list = candidates.map((b) => ({
    handle: b.handle,
    name: b.displayName ?? b.handle,
    claimed: !!b.developedLine,
    theirWords: b.developedLine,
    machineDerived: b.latentLine,
    observed: b.vouches,
    github: {
      languages: b.github?.languages ?? [],
      topics: b.github?.topics ?? [],
      recentRepos: (b.github?.recentRepos ?? []).map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language,
      })),
    },
  }));
  return `The partner said: "${query.trim()}"\n\nBuilders:\n${JSON.stringify(list, null, 2)}`;
}
