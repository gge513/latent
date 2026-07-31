import { asc, eq, isNotNull } from "drizzle-orm";

import { db } from "./db";
import { builders, entries } from "./db/schema";
import type { GithubFacts } from "./github";

/**
 * The spotlight generator (BUILD-PLAN §14): one builder at a time, on a
 * daily drip from the cron, so the stream never floods and the engine has a
 * new page every day for a month without an author.
 *
 * Selection is deterministic and plays no favorites: claimed builders first
 * (in claim order — being spotlighted in full is one more reward for
 * claiming), then unclaimed alphabetically. Slug `spotlight-<handle>` is
 * unique, so nobody is spotlighted twice and the run is idempotent per
 * builder.
 *
 * Consent posture, non-negotiable: opted-out builders never appear; a
 * claimed builder's spotlight leads with their own words; an unclaimed
 * builder gets public facts plus the latent line explicitly marked
 * machine-derived — exactly the /b card's model, nothing warmer.
 */

export type SpotlightResult = {
  created: boolean;
  slug: string;
  handle?: string;
  reason?: string;
};

function factLines(handle: string, facts: GithubFacts | null): string[] {
  const lines: string[] = [];
  if (facts?.repoCount) {
    let l = `- ${facts.repoCount} public repositories`;
    if (facts.languages?.length) {
      l += `, mostly ${facts.languages.slice(0, 3).join(", ")}`;
    }
    lines.push(l);
  }
  for (const r of (facts?.recentRepos ?? []).slice(0, 3)) {
    let l = `- \`${r.name}\``;
    if (r.language) l += ` (${r.language})`;
    if (r.description) l += `: ${r.description}`;
    if (r.homepage) l += `, live at ${r.homepage}`;
    lines.push(l);
  }
  lines.push(`- the card: @${handle}`);
  return lines;
}

export async function generateSpotlight(now: Date): Promise<SpotlightResult> {
  const done = new Set(
    (
      await db
        .select({ handle: entries.handle })
        .from(entries)
        .where(eq(entries.kind, "spotlight"))
    )
      .map((r) => r.handle)
      .filter((h): h is string => h !== null)
  );

  const claimed = await db
    .select()
    .from(builders)
    .where(isNotNull(builders.claimedAt))
    .orderBy(asc(builders.claimedAt));
  const all = await db.select().from(builders).orderBy(asc(builders.handle));
  const ordered = [...claimed, ...all.filter((b) => b.claimedAt === null)];

  const next = ordered.find((b) => !b.optedOut && !done.has(b.handle));
  if (!next) {
    return { created: false, slug: "", reason: "everyone spotlighted" };
  }

  const slug = `spotlight-${next.handle}`;
  const facts = next.github as GithubFacts | null;
  const isClaimed = next.claimedAt !== null;

  let title: string;
  let body: string;

  if (isClaimed && next.developedLine) {
    const name = next.displayName ?? `@${next.handle}`;
    title = `One of the builders: ${name} (@${next.handle})`;
    body = [
      `"${next.developedLine}"`,
      `Their own words, written when they developed their card. The public record behind them:`,
      factLines(next.handle, facts).join("\n"),
    ].join("\n\n");
  } else {
    title = `One of the builders: @${next.handle}`;
    body = [
      `Public facts from GitHub. The line below is machine-derived and stays latent until @${next.handle} develops their card.`,
      next.latentLine ? `"${next.latentLine}"` : `No line yet.`,
      factLines(next.handle, facts).join("\n"),
    ].join("\n\n");
  }

  await db.insert(entries).values({
    kind: "spotlight",
    slug,
    title,
    body,
    handle: next.handle,
    sourceRef: `github facts + card ${now.toISOString()}`,
    publishedAt: now,
  });

  return { created: true, slug, handle: next.handle };
}
