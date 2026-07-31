import { generateDigest } from "../lib/digest";

/**
 * The broad engine's CLI (`npm run db:entries`, BUILD-PLAN §14). Same
 * conventions as the other seed scripts: re-runnable, never overwrites an
 * existing slug, refuses kinds it does not know.
 *
 * Kinds land as they are built: digest today, spotlight and demo on the
 * Friday row. Essays are never generated anywhere — they are inserted only
 * from George-approved text.
 */

async function main() {
  const kindArg = process.argv.find((a) => a.startsWith("--kind="));
  const kind = kindArg ? kindArg.split("=")[1] : "digest";

  if (kind === "digest") {
    const result = await generateDigest(new Date());
    if (result.created) {
      console.log(`wrote ${result.slug}: ${result.count} pushes`);
    } else {
      console.log(`no entry (${result.reason}) — ${result.slug}`);
    }
    return;
  }

  throw new Error(
    `Unknown kind "${kind}". Built so far: digest. Spotlight and demo are the Friday row.`
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
