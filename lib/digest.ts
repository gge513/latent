import { eq } from "drizzle-orm";

import { db } from "./db";
import { builders, entries } from "./db/schema";
import { analyzeGithub } from "./github";

/**
 * The shipped-digest generator (BUILD-PLAN §14): the self-regenerating core
 * of the broad engine. Reads the builders' public GitHub activity and writes
 * one entry per day listing what was pushed in the last 24 hours.
 *
 * Rules this encodes, all non-negotiable:
 *  - Facts only. The verb is "pushed", descriptions are the repo's own words,
 *    and no adjective about a person is ever generated here.
 *  - One entry per day, slug `developed-YYYY-MM-DD`. An existing slug means
 *    this day is already written and the run is a no-op — idempotent, so the
 *    cron and the CLI can both fire without coordination.
 *  - A day nobody shipped produces no entry. Silence is honest; a filler
 *    entry is the machine talking to hear itself.
 *  - Opted-out builders never appear. The digest is marketing, and opting
 *    out of the site is opting out of being marketed by it.
 *
 * Relative imports on purpose: this module is shared by the app (cron route)
 * and the tsx seed scripts, which resolve paths differently.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;
// Keep well inside the cron route's time budget and GitHub's unauthenticated
// rate limit: 30 builders at concurrency 6 is five waves.
const CONCURRENCY = 6;

export type DigestResult = {
  created: boolean;
  slug: string;
  count: number;
  reason?: string;
};

type Ship = {
  handle: string;
  repo: string;
  language: string | null;
  description: string | null;
  homepage: string | null;
};

function dayStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function humanDate(now: Date): string {
  return now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateDigest(now: Date): Promise<DigestResult> {
  const slug = `developed-${dayStamp(now)}`;

  const existing = await db
    .select({ id: entries.id })
    .from(entries)
    .where(eq(entries.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    return { created: false, slug, count: 0, reason: "already written" };
  }

  const roster = await db
    .select({ handle: builders.handle })
    .from(builders)
    .where(eq(builders.optedOut, false));

  const since = now.getTime() - WINDOW_MS;
  const ships: Ship[] = [];

  for (let i = 0; i < roster.length; i += CONCURRENCY) {
    const wave = roster.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      wave.map(async ({ handle }) => {
        const facts = await analyzeGithub(handle);
        return { handle, facts };
      })
    );
    for (const { handle, facts } of results) {
      for (const repo of facts?.recentRepos ?? []) {
        const pushed = repo.pushedAt ? Date.parse(repo.pushedAt) : NaN;
        if (Number.isFinite(pushed) && pushed >= since && pushed <= now.getTime()) {
          ships.push({
            handle,
            repo: repo.name,
            language: repo.language,
            description: repo.description,
            homepage: repo.homepage,
          });
        }
      }
    }
  }

  if (ships.length === 0) {
    return { created: false, slug, count: 0, reason: "nothing shipped" };
  }

  ships.sort((a, b) => a.handle.localeCompare(b.handle));
  const lines = ships.map((s) => {
    let line = `- @${s.handle} pushed \`${s.repo}\``;
    if (s.language) line += ` (${s.language})`;
    if (s.description) line += `: ${s.description}`;
    if (s.homepage) line += ` — live at ${s.homepage}`;
    return line;
  });

  const body = [
    "What the builders pushed to public GitHub in the last day. " +
      "Written by the site itself, from the same feed that powers the cards.",
    lines.join("\n"),
  ].join("\n\n");

  await db.insert(entries).values({
    kind: "digest",
    slug,
    title: `Developed: ${humanDate(now)}`,
    body,
    sourceRef: `github-feed ${now.toISOString()} · ${ships.length} pushes`,
    publishedAt: now,
  });

  return { created: true, slug, count: ships.length };
}
