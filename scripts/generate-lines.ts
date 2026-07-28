/**
 * Generate the latent_line for builders who don't have one: the single dim,
 * visibly machine-derived sentence on an unclaimed card.
 *
 * Model is opus by design (BUILD-PLAN §2): these lines are generated once,
 * offline, and carry the pre-claim emotional load, so quality beats latency.
 *
 * Pre-claim safety (BUILD-PLAN §8): the line states public facts and hedged
 * observations about the WORK, never invented claims about the PERSON.
 * Re-runnable: only fills nulls; never overwrites, never touches claimed rows.
 */
import Anthropic from "@anthropic-ai/sdk";
import { and, isNull, eq } from "drizzle-orm";

import { db } from "../lib/db";
import { builders } from "../lib/db/schema";
import type { GithubFacts } from "../lib/github";

const client = new Anthropic();

const MODEL = "claude-opus-5";

const SYSTEM = `You write the single dim line shown on an unclaimed builder card on Latent, a site presenting a cohort of builders to hiring partners. The card is "latent": the builder has not spoken for themselves yet, and your line is visibly labelled machine-derived.

Write ONE sentence (25 words max) about their public GitHub work. Rules:
- Facts and hedged observation of the WORK only ("eight public repos this summer, mostly TypeScript; the latest one deployed"). Never characterize the person, their talent, or their personality.
- Plain language a non-engineer reads without translation. Language names are fine; no other technical nouns without a plain gloss.
- Dry, warm, adult. No exclamation marks, no emoji, no "passionate", no "impressive".
- If the evidence is thin, say what is actually there, plainly. Never pad, never invent.
- No em-dashes.`;

function evidence(github: GithubFacts): string {
  return JSON.stringify(
    {
      languages: github.languages,
      topics: github.topics,
      publicRepoCount: github.repoCount,
      recentRepos: github.recentRepos,
      lastPushedAt: github.lastPushedAt,
    },
    null,
    2
  );
}

async function main() {
  const rows = await db
    .select()
    .from(builders)
    .where(and(isNull(builders.latentLine), eq(builders.optedOut, false)));

  console.log(`${rows.length} builders need a latent_line.`);
  let written = 0;
  for (const row of rows) {
    const github = row.github as GithubFacts | null;
    if (!github) {
      console.log(`  skipped (no public data): ${row.handle}`);
      continue;
    }
    try {
      // Thinking is on by default on this model and max_tokens caps
      // thinking + text together; a tight cap starves the text block.
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Builder handle: ${row.handle}\n\nPublic GitHub evidence:\n${evidence(github)}`,
          },
        ],
      });
      if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") {
        console.log(`  ${res.stop_reason}: ${row.handle}`);
        continue;
      }
      const block = res.content.find((b) => b.type === "text");
      const line = block && block.type === "text" ? block.text.trim() : null;
      if (!line) {
        console.log(`  no line returned: ${row.handle}`);
        continue;
      }
      await db
        .update(builders)
        .set({ latentLine: line })
        .where(and(eq(builders.handle, row.handle), isNull(builders.latentLine)));
      written++;
      console.log(`  ${row.handle}: ${line}`);
    } catch (err) {
      console.error(`  failed: ${row.handle}`, err);
    }
  }
  console.log(`Wrote ${written} latent lines.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
