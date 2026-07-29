/**
 * Fire-and-forget aggregate counting for /proof.
 *
 * Sends a kind and nothing else. No handle, no pick, no reason, no sentence.
 * It never blocks the interaction and never surfaces a failure: a number on a
 * page nobody is looking at yet is worth less than the moment it would
 * interrupt.
 */
export function countEvent(kind: "pick" | "share" | "claim" | "match"): void {
  try {
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // counting is never load-bearing
  }
}
