/**
 * The spatial layout. Replaces Tuesday's placeholder positions with a real
 * similarity embedding of the cohort.
 *
 * WHY IT LOOKS LIKE THIS (BUILD-PLAN §6, Lock 4):
 *  - The grid was killed in aesthetic step 1, so position has to mean
 *    something. Here it means one thing only: distance is dissimilarity.
 *    Builders who work on the same kinds of things sit near each other.
 *  - There is deliberately NO meaningful axis. No "further along" direction,
 *    no top, no bottom. An axis ordered by shipped volume would be a
 *    leaderboard wearing a map's clothes, and Lock 4 kills ranking outright.
 *    "Just ahead of you" is a neighbour, never a row above you.
 *  - No live ML and no runtime layout computation. This runs offline, writes
 *    two floats per builder, and the renderer just reads them.
 *
 * Method: cosine distance over public-GitHub feature vectors, then SMACOF
 * stress majorization (deterministic: seeded init, fixed iteration count),
 * then a minimum-separation pass so no two cards overlap.
 *
 * Re-runnable and idempotent. Same data in, same coordinates out.
 * Positions are only rewritten with --force, so a hand-tune survives.
 */
import { eq } from "drizzle-orm";

import { db } from "../lib/db";
import { builders } from "../lib/db/schema";
import type { GithubFacts } from "../lib/github";

const FORCE = process.argv.includes("--force");

/** Feature weights. Languages dominate, then stated topics, then what the repos actually are. */
const W_LANGUAGE = 3;
const W_TOPIC = 2;
const W_TEXT = 1;
const W_SHAPE = 1.5;

const STOP = new Set([
  "the", "and", "for", "with", "app", "web", "site", "project", "projects",
  "my", "a", "an", "of", "to", "in", "is", "it", "this", "that", "new",
  "first", "test", "demo", "repo", "repository", "using", "built", "build",
  "simple", "small", "personal", "week", "weeks", "cohort", "hult", "course",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9.+#]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Sparse feature vector for one builder. Shape features describe HOW someone
 * works (breadth, cadence, whether things end up deployed) and sit alongside
 * the topical features, so they pull similar workers together without ever
 * becoming a direction on the map.
 */
function featureVector(facts: GithubFacts | null): Map<string, number> {
  const v = new Map<string, number>();
  const add = (key: string, weight: number) =>
    v.set(key, (v.get(key) ?? 0) + weight);

  if (!facts) {
    add("shape:unknown", W_SHAPE);
    return v;
  }

  for (const [i, lang] of (facts.languages ?? []).entries()) {
    // A builder's primary language says more than their fifth.
    add(`lang:${lang.toLowerCase()}`, W_LANGUAGE / (i + 1));
  }
  for (const topic of facts.topics ?? []) add(`topic:${topic.toLowerCase()}`, W_TOPIC);

  const repos = facts.recentRepos ?? [];
  for (const r of repos) {
    for (const t of tokens(`${r.name} ${r.description ?? ""}`)) {
      add(`text:${t}`, W_TEXT);
    }
  }

  // Shape, as features rather than axes.
  const deployed = repos.filter((r) => r.homepage).length;
  if (deployed >= 3) add("shape:ships-live", W_SHAPE);
  else if (deployed >= 1) add("shape:ships-some", W_SHAPE);
  else add("shape:no-deploys", W_SHAPE);

  const breadth = new Set((facts.languages ?? []).map((l) => l.toLowerCase())).size;
  add(breadth >= 3 ? "shape:polyglot" : "shape:focused", W_SHAPE);

  const count = facts.repoCount ?? repos.length;
  add(count >= 12 ? "shape:prolific" : count >= 4 ? "shape:steady" : "shape:early", W_SHAPE);

  return v;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, av] of a) {
    const bv = b.get(k);
    if (bv) dot += av * bv;
  }
  if (dot === 0) return 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Deterministic, seeded. No Math.random anywhere in this file. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

type Point = { x: number; y: number };

/**
 * SMACOF stress majorization. Classic, small, and deterministic: each pass
 * moves every point to the weighted average of where its neighbours want it.
 */
function embed(dist: number[][], seeds: string[], iterations = 400): Point[] {
  const n = dist.length;
  // Seeded circular init: reproducible, and no two points start on top of
  // each other (which SMACOF cannot recover from).
  let pts: Point[] = seeds.map((s, i) => {
    const angle = (i / n) * 2 * Math.PI + hash01(s) * 0.3;
    const radius = 0.35 + hash01(`${s}:r`) * 0.15;
    return { x: 0.5 + radius * Math.cos(angle), y: 0.5 + radius * Math.sin(angle) };
  });

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = pts.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      let sx = 0;
      let sy = 0;
      let w = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d = Math.hypot(dx, dy) || 1e-9;
        const target = dist[i][j];
        // Weight by 1/target so near-neighbour distances are respected more
        // than far ones. Clusters stay tight; the space between them is free.
        const weight = 1 / Math.max(target, 0.05);
        sx += weight * (pts[j].x + (target * dx) / d);
        sy += weight * (pts[j].y + (target * dy) / d);
        w += weight;
      }
      next[i] = { x: sx / w, y: sy / w };
    }
    pts = next;
  }
  return pts;
}

/** Normalise into [pad, 1-pad] preserving aspect, so the shape is not stretched. */
function normalise(pts: Point[], pad = 0.07): Point[] {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = (1 - 2 * pad) / span;
  const offX = pad + ((1 - 2 * pad) - (maxX - minX) * scale) / 2;
  const offY = pad + ((1 - 2 * pad) - (maxY - minY) * scale) / 2;
  return pts.map((p) => ({
    x: offX + (p.x - minX) * scale,
    y: offY + (p.y - minY) * scale,
  }));
}

/**
 * Cards are read, not just plotted. Two overlapping cards are unreadable, so
 * push apart anything closer than MIN_SEP. Deterministic and order-stable.
 */
function separate(pts: Point[], minSep = 0.115, passes = 220): Point[] {
  const out = pts.map((p) => ({ ...p }));
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        let dx = out[j].x - out[i].x;
        let dy = out[j].y - out[i].y;
        // Vertical crowding hurts more than horizontal: cards are wide.
        const d = Math.hypot(dx, dy * 1.9);
        if (d >= minSep || d === 0) continue;
        const push = (minSep - d) / 2;
        dx /= d || 1;
        dy /= d || 1;
        out[i].x -= dx * push;
        out[i].y -= dy * push;
        out[j].x += dx * push;
        out[j].y += dy * push;
        moved = true;
      }
    }
    for (const p of out) {
      p.x = Math.min(0.94, Math.max(0.06, p.x));
      p.y = Math.min(0.95, Math.max(0.05, p.y));
    }
    if (!moved) break;
  }
  return out;
}

function asciiMap(handles: string[], pts: Point[], cols = 74, rows = 26): string {
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => " ")
  );
  handles.forEach((h, i) => {
    const c = Math.min(cols - 1, Math.round(pts[i].x * (cols - 1)));
    const r = Math.min(rows - 1, Math.round(pts[i].y * (rows - 1)));
    const label = h.slice(0, 11);
    for (let k = 0; k < label.length && c + k < cols; k++) {
      if (grid[r][c + k] === " ") grid[r][c + k] = label[k];
    }
  });
  return grid.map((r) => r.join("").trimEnd()).join("\n");
}

async function main() {
  const rows = await db.select().from(builders);
  rows.sort((a, b) => a.handle.localeCompare(b.handle));
  console.log(`Embedding ${rows.length} builders.`);

  const vectors = rows.map((r) => featureVector(r.github as GithubFacts | null));

  const dist = rows.map((_, i) =>
    rows.map((_, j) => {
      if (i === j) return 0;
      const sim = cosine(vectors[i], vectors[j]);
      // Cosine similarity 0..1 → distance. The floor keeps identical
      // feature sets from collapsing onto the same coordinate.
      return Math.max(0.08, 1 - sim);
    })
  );

  const handles = rows.map((r) => r.handle);
  const pts = separate(normalise(embed(dist, handles)));

  console.log("\nThe space (labels start at the card's position):\n");
  console.log(asciiMap(handles, pts));

  console.log("\nNearest neighbours, for the eyeball check:\n");
  handles.forEach((h, i) => {
    const near = handles
      .map((other, j) => ({ other, d: dist[i][j], j }))
      .filter((n) => n.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map((n) => n.other)
      .join(", ");
    console.log(`  ${h.padEnd(24)} → ${near}`);
  });

  if (!FORCE) {
    console.log(
      "\nDry run. Nothing written. Re-run with --force to store these positions."
    );
    return;
  }

  for (const [i, r] of rows.entries()) {
    await db
      .update(builders)
      .set({ x: pts[i].x, y: pts[i].y })
      .where(eq(builders.handle, r.handle));
  }
  console.log(`\nWrote ${rows.length} positions.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
