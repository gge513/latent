import "server-only";

import { PostHog } from "posthog-node";

/**
 * The aggregate counter, mirrored to PostHog so the numbers on /proof can be
 * read as trends over time instead of as four running totals.
 *
 * This mirror is deliberately narrower than PostHog's defaults, because the
 * site's whole argument is that it stores nothing about the visitor. Three
 * constraints hold that line, and none of them are promises:
 *
 *   1. Server-side only. `server-only` means importing this from a client
 *      component fails the build rather than shipping a tracking script. There
 *      is no posthog-js on any page, no cookie, no persistent id, no session
 *      recording, no autocapture.
 *   2. One constant identity. Every event is attributed to AGGREGATE, so
 *      PostHog can count picks but can never resolve a person to count them
 *      by. This is the same property the events table enforces by having no
 *      handle column: Lock 4 in a second place rather than a second chance to
 *      break it.
 *   3. No properties, no address, no geoip. The kind is the entire payload.
 *      The reason a visitor typed, the sentence they spoke, the builder they
 *      picked and the country they are in are all absent by construction, not
 *      by filtering. The address PostHog stamps on a server-side call is the
 *      function's own and never a visitor's, but it is pinned to a constant
 *      anyway: a null `$ip` is refilled from the request source, so the only
 *      way to leave no address in the stream is to send one that means
 *      nothing. No row then carries a field a reader has to be told to
 *      discount.
 *
 * Without POSTHOG_KEY this is a no-op, which is what local development, CI and
 * the smoke test all get. Counting is never load-bearing: a failed send is
 * swallowed exactly like a failed insert.
 */
const KEY = process.env.POSTHOG_KEY;
const HOST = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";

/** The single identity every event is filed under. Not a person. */
const AGGREGATE = "latent";

/** Sent in place of an address, so the stream provably holds none. */
const NO_ADDRESS = "127.0.0.1";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!KEY) return null;
  client ??= new PostHog(KEY, { host: HOST, flushAt: 1, flushInterval: 0 });
  return client;
}

/**
 * Send one aggregate count. `captureImmediate` is the serverless-correct call:
 * a queued capture would be lost when the function freezes after the response,
 * and this is a single low-volume event, so batching buys nothing.
 *
 * Events are prefixed because the PostHog project is shared.
 */
export async function countEvent(kind: string): Promise<void> {
  const posthog = getClient();
  if (!posthog) return;
  try {
    await posthog.captureImmediate({
      distinctId: AGGREGATE,
      event: `latent_${kind}`,
      properties: { $process_person_profiles: false, $ip: NO_ADDRESS },
      disableGeoip: true,
    });
  } catch {
    // Counted or not, nothing the visitor sees changes.
  }
}
