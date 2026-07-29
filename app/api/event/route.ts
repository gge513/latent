import { allowRequest } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

/**
 * The aggregate counter behind /proof, and the only thing the judgment moment
 * ever writes down.
 *
 * What is stored is one row holding a kind and a timestamp. Not the pick, not
 * the reason, not the sentence, not the handle, not the IP. The events table
 * has no handle column on purpose, so there can never be a per-person count to
 * rank people by — that is Lock 4 enforced in the schema rather than in a
 * promise.
 *
 * Failing to count is not an error the visitor should ever see. A refused or
 * broken write returns the same 204 as a successful one: the number on /proof
 * is worth less than the interaction it would interrupt.
 */
const KINDS = new Set(["pick", "share", "claim", "match"]);

export const runtime = "nodejs";

export async function POST(req: Request) {
  const done = new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
  try {
    const { kind } = (await req.json()) as { kind?: unknown };
    if (typeof kind !== "string" || !KINDS.has(kind)) return done;

    const ip = (req.headers.get("x-forwarded-for") ?? "unknown")
      .split(",")[0]
      .trim();
    // Its own bucket, so counting a share never costs anyone a match.
    if (!(await allowRequest(ip, "event", 60))) return done;

    await db.insert(events).values({ kind });
  } catch {
    // Counted or not, the visitor's flow does not change.
  }
  return done;
}
