import { readFileSync } from "node:fs";
import { join } from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";

import { db } from "./db";
import { builders, entries, vouches } from "./db/schema";
import type { GithubFacts } from "./github";
import {
  MATCH_CANDIDATES,
  MATCH_SYSTEM,
  matchPrompt,
  rankCandidates,
  type BuilderForMatching,
} from "./match";

/**
 * The demo generator (BUILD-PLAN §14): runs the real matcher against the
 * site's OWN example sentences (data/demo-needs.json) and writes the result
 * as an entry. The product proving itself in public, on the record.
 *
 * Store-nothing is untouched by construction: the inputs are our fixtures,
 * never a visitor's words. CLI-only — never on the cron, because each run
 * spends a model call, and the fixture list is finite.
 *
 * One fixture per run, first not-yet-written, slug `demo-<id>` unique: same
 * idempotence contract as every other generator.
 */

export type DemoResult = {
  created: boolean;
  slug: string;
  reason?: string;
};

type Fixture = { id: string; sentence: string };

async function loadPool(): Promise<BuilderForMatching[]> {
  const rows = await db
    .select()
    .from(builders)
    .where(eq(builders.optedOut, false));
  const allVouches = await db.select().from(vouches);
  const byHandle = new Map<string, string[]>();
  for (const v of allVouches) {
    const list = byHandle.get(v.toHandle) ?? [];
    list.push(v.text);
    byHandle.set(v.toHandle, list);
  }
  return rows.map((r) => ({
    handle: r.handle,
    displayName: r.displayName,
    github: r.github as GithubFacts | null,
    latentLine: r.latentLine,
    developedLine: r.developedLine,
    vouches: byHandle.get(r.handle) ?? [],
    claimedAt: r.claimedAt,
    contact: r.contact,
  }));
}

function parseSections(text: string): { handle: string; why: string }[] {
  const out: { handle: string; why: string }[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.trim().split("\n");
    const m = lines[0]?.trim().match(/^@([a-z0-9][a-z0-9-]*)$/i);
    if (m && lines.length > 1) {
      out.push({ handle: m[1].toLowerCase(), why: lines.slice(1).join(" ").trim() });
    }
  }
  return out;
}

export async function generateDemo(now: Date): Promise<DemoResult> {
  const fixtures = JSON.parse(
    readFileSync(join(process.cwd(), "data/demo-needs.json"), "utf8")
  ) as Fixture[];

  const written = new Set(
    (
      await db
        .select({ slug: entries.slug })
        .from(entries)
        .where(eq(entries.kind, "demo"))
    ).map((r) => r.slug)
  );
  const fixture = fixtures.find((f) => !written.has(`demo-${f.id}`));
  if (!fixture) {
    return { created: false, slug: "", reason: "all fixtures written" };
  }
  const slug = `demo-${fixture.id}`;

  const pool = await loadPool();
  const shortlist = rankCandidates(fixture.sentence, pool)
    .slice(0, MATCH_CANDIDATES)
    .map((s) => s.builder);

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 600,
    // Same as the live route: thinking off, or it eats the token budget and
    // the text block starves (the Deck 029 Opus lesson, sonnet edition).
    thinking: { type: "disabled" },
    system: MATCH_SYSTEM,
    messages: [
      { role: "user", content: matchPrompt(fixture.sentence, shortlist) },
    ],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const valid = new Set(pool.map((b) => b.handle));
  const matches = parseSections(text).filter((m) => valid.has(m.handle));
  if (matches.length === 0) {
    return { created: false, slug, reason: "matcher returned no parseable matches" };
  }

  const body = [
    `The sentence: "${fixture.sentence}"`,
    `The matcher's own answer, written by the machine and grounded in public repos. Why each builder is close to the work described:`,
    matches.map((m) => `- @${m.handle}: ${m.why}`).join("\n"),
    `Nothing a real visitor types is ever stored. This entry came from one of the site's own example sentences, through the same path a visitor's sentence takes.`,
  ].join("\n\n");

  await db.insert(entries).values({
    kind: "demo",
    slug,
    title: `"${fixture.sentence}"`,
    body,
    sourceRef: `matcher run ${now.toISOString()} · claude-sonnet-5`,
    publishedAt: now,
  });

  return { created: true, slug };
}
