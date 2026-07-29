import { readFileSync } from "fs";
import { join } from "path";

import { and, eq } from "drizzle-orm";

import { db } from "../lib/db";
import { builders, vouches } from "../lib/db/schema";

/**
 * Seeds the human-written observed lines.
 *
 * The machinery is here; the words are not. Every line in data/vouches.json is
 * George's, drawn from the fourteen Week 2 dossiers he wrote after driving each
 * peer's deploy live. Nobody else in the cohort holds that evidence layer, and
 * a generated line would be exactly the "sameness" this whole site argues
 * against.
 *
 * Safe to re-run:
 *  - It never overwrites an existing line from the same observer. Edit in the
 *    database or delete the row first if a line needs to change.
 *  - It refuses to vouch for a handle that is not in the roster, rather than
 *    inventing a builder row.
 *  - It writes nothing when the file has no lines, which is the state before
 *    George has signed off.
 */
type File = { observer: string; lines: Record<string, string> };

async function main() {
  const path = join(process.cwd(), "data", "vouches.json");
  const file = JSON.parse(readFileSync(path, "utf8")) as File;
  const observer = file.observer?.toLowerCase();
  const entries = Object.entries(file.lines ?? {});

  if (!observer) throw new Error("data/vouches.json needs an 'observer' handle");
  if (entries.length === 0) {
    console.log(
      "No lines in data/vouches.json yet. Nothing seeded.\n" +
        "Candidates and their evidence are in week3-vibe/VOUCH-WORKSHEET.md;\n" +
        "they need George's hand and sign-off before they land here."
    );
    return;
  }

  const roster = new Set(
    (await db.select({ handle: builders.handle }).from(builders)).map((r) => r.handle)
  );

  let written = 0;
  let kept = 0;
  let unknown = 0;

  for (const [rawHandle, text] of entries) {
    const handle = rawHandle.toLowerCase();
    const line = text.trim();
    if (!line) continue;

    if (!roster.has(handle)) {
      console.warn(`  ? @${handle} is not in the roster — skipped, not invented`);
      unknown++;
      continue;
    }

    const existing = await db
      .select({ id: vouches.id })
      .from(vouches)
      .where(and(eq(vouches.toHandle, handle), eq(vouches.fromHandle, observer)));

    if (existing.length > 0) {
      kept++;
      continue;
    }

    await db.insert(vouches).values({
      toHandle: handle,
      fromHandle: observer,
      text: line,
    });
    written++;
    console.log(`  + @${handle}`);
  }

  console.log(
    `\n${written} written, ${kept} already present and left alone, ${unknown} unknown handles.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
