import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";

/**
 * Server-side reads for /developing, the self-written content stream
 * (BUILD-PLAN §14). Same posture as lib/builders.ts: "server-only" is
 * load-bearing, and callers that prerender wrap these in the same build-time
 * tolerance the home page uses.
 */

export type Entry = {
  id: number;
  kind: string;
  slug: string;
  title: string;
  body: string;
  handle: string | null;
  sourceRef: string | null;
  publishedAt: Date;
};

export async function getEntries(): Promise<Entry[]> {
  return db.select().from(entries).orderBy(desc(entries.publishedAt));
}

export async function getEntry(slug: string): Promise<Entry | null> {
  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEntrySlugs(): Promise<string[]> {
  const rows = await db.select({ slug: entries.slug }).from(entries);
  return rows.map((r) => r.slug);
}
