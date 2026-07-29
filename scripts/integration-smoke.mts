import { sql } from "drizzle-orm";

import { db } from "../lib/db";
import {
  CONNECTIVE,
  DEFAULT_MODE,
  composeSentence,
  detectMode,
  parseSentence,
} from "../lib/frame-mode";
import { keywordMatches, rankCandidates, type BuilderForMatching } from "../lib/match";

/**
 * Integration smoke for Latent.
 *
 * Deliberately READ-ONLY against whatever DATABASE_URL points at. Tavern's
 * smoke wrote real rows, which is why it needed a throwaway Neon branch to run
 * safely; this one asserts invariants instead, so it is safe to point at
 * production and there is no branch machinery to get wrong.
 *
 * Every check goes through check(), which records a failure and drives the exit
 * code. A smoke test that cannot fail is decoration: this one is verified by
 * sabotage, not by assumption.
 *
 * What it guards:
 *  - Lock 4 in the schema. The events table must have no handle column, so a
 *    per-person count cannot exist to rank people by.
 *  - The consent model. An unclaimed builder must never carry a contact.
 *  - The roster is really there and positioned.
 *  - The rungs that must survive the model being offline: keyword matching and
 *    the whole J7 sentence decision, neither of which may touch the network.
 */
type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

function hostOf(url: string | undefined): string {
  if (!url) return "(DATABASE_URL unset)";
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  console.log(`smoke target: ${hostOf(process.env.DATABASE_URL)} (read-only)\n`);

  console.log("— the schema keeps the promises the copy makes");
  const eventCols = await db.execute(
    sql`select column_name from information_schema.columns where table_schema='latent' and table_name='events'`
  );
  const names = eventCols.rows.map((r) => String(r.column_name));
  check(
    "events has no handle column, so no per-person count can exist",
    !names.some((n) => /handle|builder|user|ip/.test(n)),
    names.join(", ")
  );

  const builderCols = await db.execute(
    sql`select column_name from information_schema.columns where table_schema='latent' and table_name='builders'`
  );
  check(
    "builders has the contact column the claim flow writes",
    builderCols.rows.some((r) => r.column_name === "contact")
  );

  console.log("\n— the roster is real");
  const roster = await db.execute(
    sql`select count(*)::int as n,
               count(x)::int as positioned,
               count(latent_line)::int as lined,
               count(*) filter (where claimed_at is null and contact is not null)::int as leaky
        from latent.builders where opted_out = false`
  );
  const r = roster.rows[0] as {
    n: number;
    positioned: number;
    lined: number;
    leaky: number;
  };
  check("the roster is populated", r.n >= 20, `${r.n} builders`);
  check("every builder has a position in the space", r.positioned === r.n, `${r.positioned}/${r.n}`);
  check("every builder has a line to show", r.lined === r.n, `${r.lined}/${r.n}`);
  check(
    "no unclaimed builder carries a contact — reachability is the reward for claiming",
    r.leaky === 0,
    `${r.leaky} violations`
  );

  console.log("\n— rung 3: matching still works with the model offline");
  const rows = await db.execute(
    sql`select handle, display_name, github, latent_line, developed_line, claimed_at, contact
        from latent.builders where opted_out = false`
  );
  const pool: BuilderForMatching[] = rows.rows.map((b) => ({
    handle: String(b.handle),
    displayName: (b.display_name as string) ?? null,
    github: b.github as BuilderForMatching["github"],
    latentLine: (b.latent_line as string) ?? null,
    developedLine: (b.developed_line as string) ?? null,
    vouches: [],
    claimedAt: (b.claimed_at as Date) ?? null,
    contact: (b.contact as string) ?? null,
  }));

  const query = "I am a nonprofit director looking to build a patient community app with AI";
  const ranked = rankCandidates(query, pool);
  check("deterministic ranking returns candidates", ranked.length > 0, `${ranked.length} scored`);
  const kw = keywordMatches(query, pool);
  check("the keyword rung returns matches", kw.length > 0, `${kw.length} matches`);
  check(
    "every keyword match carries an explanation",
    kw.every((m) => m.explanation.trim().length > 0)
  );
  check(
    "every keyword match is a real builder",
    kw.every((m) => pool.some((p) => p.handle === m.handle))
  );

  console.log("\n— J7: the sentence decides locally, with no network at all");
  check("a stranger gets the wider door", DEFAULT_MODE === "build");
  check("someone building sees the build connective", detectMode("nonprofit director") === "build");
  check("a recruiter sees the sourcing connective", detectMode("recruiter") === "source");
  check(
    "a partial word cannot swap the sentence",
    detectMode("talent") === null && detectMode("talented engineer") === "build"
  );
  check(
    "a keyword inside another word is not a match",
    detectMode("nonprofrecruitert director") === "build"
  );
  check(
    "the spoken sentence keeps the work in the second blank",
    parseSentence("I'm a recruiter looking for someone to build an internal tool").blank2 ===
      "an internal tool"
  );
  check(
    "what the matcher receives is a whole sentence",
    composeSentence("recruiter", "an app", "source") ===
      `I am a recruiter ${CONNECTIVE.source} an app`
  );

  const failed = results.filter((x) => !x.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} passed${failed.length ? `, ${failed.length} FAILED` : ""}`
  );
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
