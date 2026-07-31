import { generateDemo } from "../lib/demo";
import { generateDigest } from "../lib/digest";
import { generateSpotlight } from "../lib/spotlight";

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

  const countArg = process.argv.find((a) => a.startsWith("--count="));
  const count = countArg ? Number(countArg.split("=")[1]) : 1;

  if (kind === "digest") {
    const result = await generateDigest(new Date());
    console.log(
      result.created
        ? `wrote ${result.slug}: ${result.count} pushes`
        : `no entry (${result.reason}): ${result.slug}`
    );
    return;
  }

  if (kind === "spotlight") {
    for (let i = 0; i < count; i++) {
      const result = await generateSpotlight(new Date());
      console.log(
        result.created
          ? `wrote ${result.slug}`
          : `no entry (${result.reason})`
      );
      if (!result.created) break;
    }
    return;
  }

  if (kind === "demo") {
    for (let i = 0; i < count; i++) {
      const result = await generateDemo(new Date());
      console.log(
        result.created
          ? `wrote ${result.slug}`
          : `no entry (${result.reason})`
      );
      if (!result.created) break;
    }
    return;
  }

  throw new Error(`Unknown kind "${kind}". Kinds: digest, spotlight, demo.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
