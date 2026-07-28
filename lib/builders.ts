import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { builders, vouches } from "@/lib/db/schema";
import type { GithubFacts } from "@/lib/github";

/**
 * Server-side reads for the browsable space (rung 4 of the degradation
 * ladder) and the individual builder pages.
 *
 * Everything here is public-by-construction: opted-out builders are filtered
 * at the source so no code path downstream can accidentally render one.
 */

export type SpaceBuilder = {
  handle: string;
  displayName: string | null;
  /** Their words, written at claim. Null until claimed. */
  developedLine: string | null;
  /** Machine-derived from public facts. Always shown as such. */
  latentLine: string | null;
  claimed: boolean;
  x: number;
  y: number;
  languages: string[];
};

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

/** Handles only, for static generation of the builder pages. */
export async function getHandles(): Promise<string[]> {
  const rows = await db
    .select({ handle: builders.handle, optedOut: builders.optedOut })
    .from(builders)
    .orderBy(asc(builders.handle));
  return rows.filter((r) => !r.optedOut).map((r) => r.handle);
}

/**
 * The one line a card carries. Claimed builders speak for themselves; latent
 * ones get the machine-derived line, and the caller is responsible for
 * marking it as machine-derived on screen.
 */
export function lineFor(b: SpaceBuilder): { text: string; theirs: boolean } | null {
  if (b.developedLine) return { text: b.developedLine, theirs: true };
  if (b.latentLine) return { text: b.latentLine, theirs: false };
  return null;
}
