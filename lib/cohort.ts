import "server-only";

/**
 * Cohort project status, read-only. This is the "PM integration" mandatory row
 * in `requirements.md`, and the reason it reads GitHub rather than the PM
 * platform is worth writing down, because it looks like a shortcut and is not.
 *
 * **Forth is auth-walled.** Verified 2026-08-03: `/api`, `/api/projects`,
 * `/api/status`, `/api/tasks`, `/projects` and `/status` all 404, and the
 * homepage renders "Checking your account... Please wait while Forth checks
 * whether you are already signed in." Its own positioning is "Private
 * workspaces". So a live read of the PM platform is unavailable to anyone
 * without credentials, which is why `requirements.md` sets the floor at
 * "synced JSON, minimum: static snapshot updated daily".
 *
 * Rather than hand-keep a snapshot, this reads the cohort repository's own
 * merged submission PRs across the three phase-1 project branches. That is the
 * system of record for what actually shipped: a builder appears here when
 * their PR merges, having done nothing, and no number here is typed by hand.
 *
 * Failure is honest and this is the load-bearing rule. If GitHub is
 * unreachable the panel says the check could not run and renders no numbers.
 * It never falls back to remembered values, because a stale count under a
 * fresh timestamp is a claim we cannot support. Degrading is allowed;
 * fabricating is not.
 */

const REPO = "rogerSuperBuilderAlpha/hult-cohort-program";

const PROJECTS = [
  {
    key: "project-1",
    title: "Project 1 · Project management platform",
    branch: "projects/summer26/phase-1-project-1",
  },
  {
    key: "project-2",
    title: "Project 2 · Internal communications",
    branch: "projects/summer26/phase-1-project-2",
  },
  {
    key: "project-3",
    title: "Project 3 · Public showcase",
    branch: "projects/summer26/phase-1-project-3",
  },
] as const;

export type ProjectStatus = {
  key: string;
  title: string;
  branch: string;
  /** Merged submission PRs on this branch. Null when the check could not run. */
  merged: number | null;
  /** ISO timestamp of the most recent merge, or null. */
  latestAt: string | null;
};

export type CohortStatus = {
  source: string;
  checkedAt: string;
  /** False when any branch failed to read. The page must say so, not hide it. */
  complete: boolean;
  projects: ProjectStatus[];
};

type PullRequest = {
  merged_at: string | null;
  title: string;
};

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "latent-cohort-status",
  };
  // Same convention as lib/github.ts. Unauthenticated works and is well inside
  // the rate limit at three calls an hour, but a token raises the ceiling.
  if (process.env.GITHUB_PAT) h.Authorization = `Bearer ${process.env.GITHUB_PAT}`;
  return h;
}

async function readBranch(
  branch: string
): Promise<{ merged: number; latestAt: string | null } | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/pulls` +
        `?state=closed&base=${encodeURIComponent(branch)}&per_page=100`,
      { headers: headers(), next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const pulls = (await res.json()) as PullRequest[];
    // Only submissions count as project status. The branches also carry docs
    // and update PRs, and counting those would inflate "what shipped".
    const merged = pulls.filter(
      (p) => p.merged_at !== null && /submission/i.test(p.title)
    );
    const latestAt = merged
      .map((p) => p.merged_at as string)
      .sort()
      .at(-1) ?? null;

    return { merged: merged.length, latestAt };
  } catch {
    return null;
  }
}

export async function getCohortStatus(): Promise<CohortStatus> {
  const results = await Promise.all(
    PROJECTS.map(async (p) => {
      const read = await readBranch(p.branch);
      return {
        key: p.key,
        title: p.title,
        branch: p.branch,
        merged: read?.merged ?? null,
        latestAt: read?.latestAt ?? null,
      } satisfies ProjectStatus;
    })
  );

  return {
    source: REPO,
    checkedAt: new Date().toISOString(),
    complete: results.every((r) => r.merged !== null),
    projects: results,
  };
}
