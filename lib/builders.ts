import "server-only";

import { and, asc, count, eq, isNotNull } from "drizzle-orm";

import type { SpaceBuilder } from "@/lib/builder-card";
import { db } from "@/lib/db";
import { builders, events, vouches } from "@/lib/db/schema";
import type { GithubFacts } from "@/lib/github";

/**
 * Server-side reads for the browsable space (rung 4 of the degradation
 * ladder) and the individual builder pages.
 *
 * Everything here is public-by-construction: opted-out builders are filtered
 * at the source so no code path downstream can accidentally render one.
 *
 * "server-only" is load-bearing. This module reaches the database, and the
 * database client throws at import time when DATABASE_URL is absent — which is
 * always true in a browser. A client component that imports this file used to
 * fail at hydration and take the tab down with it; now it fails the build
 * instead, where a mistake is cheap.
 */

export type { SpaceBuilder } from "@/lib/builder-card";

export type BuilderProfile = SpaceBuilder & {
  github: GithubFacts | null;
  vouches: { from: string; text: string }[];
};

function languagesOf(github: unknown): string[] {
  return ((github as GithubFacts | null)?.languages ?? []).slice(0, 3);
}

export async function getSpace(): Promise<SpaceBuilder[]> {
  const rows = await db
    .select()
    .from(builders)
    .where(eq(builders.optedOut, false))
    .orderBy(asc(builders.handle));

  return rows
    .filter((r) => r.x !== null && r.y !== null)
    .map((r) => ({
      handle: r.handle,
      displayName: r.displayName,
      developedLine: r.developedLine,
      latentLine: r.latentLine,
      claimed: r.claimedAt !== null,
      x: r.x as number,
      y: r.y as number,
      languages: languagesOf(r.github),
    }));
}

export async function getBuilder(handle: string): Promise<BuilderProfile | null> {
  const [row] = await db
    .select()
    .from(builders)
    .where(eq(builders.handle, handle.toLowerCase()));

  if (!row || row.optedOut) return null;

  const vouchRows = await db
    .select()
    .from(vouches)
    .where(eq(vouches.toHandle, row.handle))
    .orderBy(asc(vouches.createdAt));

  return {
    handle: row.handle,
    displayName: row.displayName,
    developedLine: row.developedLine,
    latentLine: row.latentLine,
    claimed: row.claimedAt !== null,
    x: row.x ?? 0.5,
    y: row.y ?? 0.5,
    languages: languagesOf(row.github),
    github: row.github as GithubFacts | null,
    vouches: vouchRows.map((v) => ({ from: v.fromHandle, text: v.text })),
  };
}

/**
 * The three numbers /proof is allowed to know. Aggregates only: the events
 * table has no handle column, so a per-person count is impossible to write,
 * not just unwritten.
 */
export async function getProofCounts(): Promise<{
  developed: number;
  total: number;
  sent: number;
}> {
  const [totalRow] = await db
    .select({ n: count() })
    .from(builders)
    .where(eq(builders.optedOut, false));
  const [developedRow] = await db
    .select({ n: count() })
    .from(builders)
    .where(and(eq(builders.optedOut, false), isNotNull(builders.claimedAt)));
  const [sentRow] = await db
    .select({ n: count() })
    .from(events)
    .where(eq(events.kind, "share"));
  return {
    developed: developedRow?.n ?? 0,
    total: totalRow?.n ?? 0,
    sent: sentRow?.n ?? 0,
  };
}

/** Handles only, for static generation of the builder pages. */
export async function getHandles(): Promise<string[]> {
  const rows = await db
    .select({ handle: builders.handle, optedOut: builders.optedOut })
    .from(builders)
    .orderBy(asc(builders.handle));
  return rows.filter((r) => !r.optedOut).map((r) => r.handle);
}
