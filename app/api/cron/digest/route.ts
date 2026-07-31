import { NextResponse } from "next/server";

import { generateDigest } from "@/lib/digest";
import { generateSpotlight } from "@/lib/spotlight";

/**
 * The daily cron target (vercel.json `crons`). This route is what makes
 * "the site markets itself" literally true: Vercel calls it once a day, it
 * reads the builders' public GitHub feed, and the stream gains an entry with
 * no author.
 *
 * Guarded: Vercel sends `Authorization: Bearer ${CRON_SECRET}` to cron
 * routes when the env var is set. No secret configured means the route
 * refuses to run at all — fail-closed, because an open endpoint that spends
 * GitHub rate limit and writes to the database is exactly what §5 ruled out.
 *
 * Fail-quiet on errors: a cron failure may never take the site down, so the
 * catch reports and returns 200 to stop Vercel retry-hammering a broken day.
 */

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    // The daily pair: the digest (what shipped), then one spotlight from the
    // drip (who's next in the deterministic order). Demos never run here —
    // they spend a model call and the fixture list is finite.
    const digest = await generateDigest(new Date());
    const spotlight = await generateSpotlight(new Date());
    return NextResponse.json({ digest, spotlight });
  } catch (err) {
    console.error(
      "cron/digest failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ created: false, reason: "error" });
  }
}
