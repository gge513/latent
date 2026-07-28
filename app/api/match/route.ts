import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";

import type { GithubFacts } from "@/lib/github";
import {
  MATCH_CANDIDATES,
  MATCH_SYSTEM,
  keywordMatches,
  matchPrompt,
  rankCandidates,
  type BuilderForMatching,
} from "@/lib/match";
import { allowRequest } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { builders, vouches } from "@/lib/db/schema";

/**
 * The centerpiece endpoint: partner sentence in, matches out, streamed so the
 * explanation develops as it's written.
 *
 * Wire format (text/plain):
 *   line 1        JSON header {mode, candidates: [{handle, name, line}]}
 *   rest          sections: a line with only @handle, then explanation text,
 *                 then a blank line. The rung-3 keyword fallback uses the SAME
 *                 section format, so the client renders both paths identically.
 *
 * Hardening: per-IP rate limit (Neon), hard input cap, hard token cap.
 * Nothing the partner says is persisted — no audio, no transcript, no query.
 */
const MAX_INPUT = 300;
const MAX_TOKENS = 600;

export const runtime = "nodejs";

async function loadPool(): Promise<BuilderForMatching[]> {
  const rows = await db
    .select()
    .from(builders)
    .where(eq(builders.optedOut, false));
  const allVouches = await db.select().from(vouches);
  const byHandle = new Map<string, string[]>();
  for (const v of allVouches) {
    const list = byHandle.get(v.toHandle) ?? [];
    list.push(v.text);
    byHandle.set(v.toHandle, list);
  }
  return rows.map((r) => ({
    handle: r.handle,
    displayName: r.displayName,
    github: r.github as GithubFacts | null,
    latentLine: r.latentLine,
    developedLine: r.developedLine,
    vouches: byHandle.get(r.handle) ?? [],
  }));
}

type Meta = { handle: string; name: string | null; line: string | null };

function metaFor(b: BuilderForMatching): Meta {
  return {
    handle: b.handle,
    name: b.displayName,
    line: b.developedLine ?? b.latentLine,
  };
}

function sectionsFor(matches: { handle: string; explanation: string }[]): string {
  return matches.map((m) => `@${m.handle}\n${m.explanation}\n\n`).join("");
}

/** Rung 3: same wire format, keyword matches, plainly labelled by lib/match. */
function fallbackResponse(query: string, pool: BuilderForMatching[]): Response {
  const matches = keywordMatches(query, pool);
  const header =
    JSON.stringify({ mode: "keyword", candidates: matches.map((m) => ({ handle: m.handle, name: m.displayName, line: null })) }) + "\n";
  return new Response(header + sectionsFor(matches), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = ((await req.json()) as { q?: unknown }).q;
  } catch {
    raw = null;
  }
  if (typeof raw !== "string" || !raw.trim()) {
    return Response.json({ error: "say or type what your team is trying to do" }, { status: 400 });
  }
  const query = raw.trim().slice(0, MAX_INPUT);

  const pool = await loadPool();
  if (pool.length === 0) {
    return Response.json({ error: "no builders yet" }, { status: 503 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!(await allowRequest(ip))) return fallbackResponse(query, pool);
  if (!process.env.ANTHROPIC_API_KEY) return fallbackResponse(query, pool);

  // Deterministic narrowing; pad thin matches with recently active builders
  // so the model always sees a real shortlist.
  const ranked = rankCandidates(query, pool).map((s) => s.builder);
  if (ranked.length < MATCH_CANDIDATES) {
    const seen = new Set(ranked.map((b) => b.handle));
    const padding = [...pool]
      .filter((b) => !seen.has(b.handle))
      .sort((a, b) =>
        (b.github?.lastPushedAt ?? "").localeCompare(a.github?.lastPushedAt ?? "")
      );
    ranked.push(...padding);
  }
  const candidates = ranked.slice(0, MATCH_CANDIDATES);

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: MAX_TOKENS,
    thinking: { type: "disabled" },
    system: MATCH_SYSTEM,
    messages: [{ role: "user", content: matchPrompt(query, candidates) }],
  });

  const encoder = new TextEncoder();
  const header =
    JSON.stringify({ mode: "stream", candidates: candidates.map(metaFor) }) + "\n";

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(header));
      let emitted = 0;
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            emitted += event.delta.text.length;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") emitted = 0;
      } catch {
        // fall through to the keyword sections below if nothing was written
      }
      if (emitted === 0) {
        controller.enqueue(encoder.encode(sectionsFor(keywordMatches(query, pool))));
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
