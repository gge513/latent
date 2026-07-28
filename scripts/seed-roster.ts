/**
 * Roster seed: create LATENT cards for the real cohort from public evidence.
 *
 * Sources (all public): PRs on the course repo whose branches live under
 * participants/. For each builder we store public GitHub facts and a
 * deterministic spatial position. No display_name, no generated biography —
 * a card stays latent until its builder claims it.
 *
 * Roster scope is PROVISIONAL (open question in BRAINSTORM.md): everyone who
 * has opened a participants/ PR, not only merged submissions.
 *
 * Re-runnable: claimed fields (display_name, developed_line, claimed_at,
 * opted_out) are never touched; github facts and updated_at refresh.
 * Positions are only set when missing, so Thursday's hand-tune survives.
 */
import { sql } from "drizzle-orm";

import { analyzeGithub, type GithubFacts } from "../lib/github";
import { db } from "../lib/db";
import { builders } from "../lib/db/schema";

const COURSE_REPO = "rogerSuperBuilderAlpha/hult-cohort-program";
const STAFF = new Set(["rogersuperbuilderalpha"]);

const GH = "https://api.github.com";

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "latent-roster-seed",
  };
  if (process.env.GITHUB_PAT) h.Authorization = `Bearer ${process.env.GITHUB_PAT}`;
  return h;
}

async function fetchParticipants(): Promise<string[]> {
  const roster = new Set<string>();
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `${GH}/repos/${COURSE_REPO}/pulls?state=all&per_page=100&page=${page}`,
      { headers: ghHeaders() }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const prs = (await res.json()) as {
      head: { ref: string };
      user: { login: string; type: string } | null;
    }[];
    if (prs.length === 0) break;

    for (const pr of prs) {
      if (!pr.head.ref.startsWith("participants/")) continue;
      const author = pr.user;
      if (!author || author.type !== "User") continue;
      const login = author.login.toLowerCase();
      if (STAFF.has(login)) continue;
      // Guard against staff-submitted-on-behalf PRs: the branch tail must
      // actually reference the author's handle.
      const tail = pr.head.ref.split("/").pop() ?? "";
      if (!tail.toLowerCase().startsWith(login)) continue;
      roster.add(login);
    }
    if (prs.length < 100) break;
  }
  return [...roster].sort();
}

/**
 * Deterministic placeholder positions until Thursday's hand-tune: builders
 * cluster by primary language around the space, jittered by handle hash.
 * Stored as 0..1 floats; the renderer owns projection.
 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function positionFor(
  handle: string,
  facts: GithubFacts | null,
  languageOrder: string[]
): { x: number; y: number } {
  const primary = facts?.languages?.[0] ?? "none";
  const idx = Math.max(0, languageOrder.indexOf(primary));
  const n = Math.max(1, languageOrder.length);
  const angle = (idx / n) * 2 * Math.PI;
  const cx = 0.5 + 0.3 * Math.cos(angle);
  const cy = 0.5 + 0.3 * Math.sin(angle);
  return {
    x: Math.min(0.95, Math.max(0.05, cx + (hash(handle) - 0.5) * 0.18)),
    y: Math.min(0.95, Math.max(0.05, cy + (hash(handle + "y") - 0.5) * 0.18)),
  };
}

async function main() {
  const roster = await fetchParticipants();
  console.log(`Found ${roster.length} cohort members in course-repo PRs.`);

  const facts = new Map<string, GithubFacts | null>();
  for (const login of roster) {
    facts.set(login, await analyzeGithub(login));
    console.log(`  analyzed: ${login}`);
  }

  const languageOrder = [
    ...new Set(
      [...facts.values()].map((f) => f?.languages?.[0] ?? "none")
    ),
  ].sort();

  let written = 0;
  for (const login of roster) {
    const f = facts.get(login) ?? null;
    const pos = positionFor(login, f, languageOrder);
    await db
      .insert(builders)
      .values({
        handle: login,
        github: f,
        x: pos.x,
        y: pos.y,
      })
      .onConflictDoUpdate({
        target: builders.handle,
        set: {
          // Refresh public facts; never touch claimed fields. Keep existing
          // positions so a hand-tuned layout survives re-seeding.
          github: f,
          x: sql`coalesce(${builders.x}, ${pos.x})`,
          y: sql`coalesce(${builders.y}, ${pos.y})`,
          updatedAt: sql`now()`,
        },
      });
    written++;
  }
  console.log(`Wrote ${written} builder cards (claimed fields untouched).`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
