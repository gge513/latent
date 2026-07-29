import { createHash } from "crypto";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";

/**
 * Fixed-window per-IP rate limit, Neon-backed. The unauthenticated /api/match
 * endpoint spends money; this caps it. IPs are stored only as salted hashes.
 * A denied or failed check degrades to the keyword match (rung 3), never to
 * an error page.
 */
const WINDOW = "10 minutes";
const LIMIT = 10;

/**
 * Buckets keep one endpoint from eating another's window. The match endpoint
 * spends money and gets the tight budget; free writes like the aggregate
 * counter get their own, so counting a share can never cost someone a match.
 */
export async function allowRequest(
  ip: string,
  bucket = "match",
  limit = LIMIT
): Promise<boolean> {
  const ipHash = createHash("sha256")
    .update(`latent:${bucket}:${ip}`)
    .digest("hex");
  try {
    const rows = await db
      .insert(rateLimit)
      .values({ ipHash, windowStart: new Date(), count: 1 })
      .onConflictDoUpdate({
        target: rateLimit.ipHash,
        set: {
          count: sql`case when ${rateLimit.windowStart} < now() - interval '${sql.raw(WINDOW)}' then 1 else ${rateLimit.count} + 1 end`,
          windowStart: sql`case when ${rateLimit.windowStart} < now() - interval '${sql.raw(WINDOW)}' then now() else ${rateLimit.windowStart} end`,
        },
      })
      .returning({ count: rateLimit.count });
    return (rows[0]?.count ?? limit + 1) <= limit;
  } catch {
    // Fail closed: no limiter, no model spend. Caller serves the fallback.
    return false;
  }
}
