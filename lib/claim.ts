"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth, signIn, signOut } from "@/auth";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { builders, events } from "@/lib/db/schema";

/**
 * The claim flow's write path (BUILD-PLAN §8). The rules, enforced here and
 * not just promised:
 *
 *  - The handle from OAuth must match the card. Every write below keys off
 *    session.user.login and nothing else — there is no card parameter to
 *    tamper with, so claiming someone else is unexpressible, not just
 *    forbidden.
 *  - On claim: their words become the line, optionally their name and a way
 *    to be reached. claimedAt is set once, on first claim.
 *  - Removal is immediate and needs no justification.
 *  - The only aggregate ever recorded is a handle-less 'claim' event, and
 *    only on the first claim, never on edits.
 */

const LINE_MAX = 240;
const NAME_MAX = 60;
const CONTACT_MAX = 120;

/** One line means one line: collapse whitespace, cap the length. */
function oneLine(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function requireLogin(): Promise<string> {
  const session = await auth();
  const login = session?.user?.login;
  if (!login) redirect("/claim");
  return login;
}

function refresh(handle: string) {
  revalidatePath("/");
  revalidatePath(`/b/${handle}`);
  revalidatePath("/proof");
  revalidatePath("/claim");
}

export async function claimCard(formData: FormData): Promise<void> {
  const login = await requireLogin();

  const developedLine = oneLine(formData.get("line"), LINE_MAX);
  const displayName = oneLine(formData.get("name"), NAME_MAX);
  const contact = oneLine(formData.get("contact"), CONTACT_MAX);

  // A claim without their words is not a claim. The page marks the field
  // required; this is the enforcement behind it.
  if (!developedLine) redirect("/claim?empty=1");

  const [row] = await db
    .select({ claimedAt: builders.claimedAt })
    .from(builders)
    .where(eq(builders.handle, login));
  // Signed in, but not one of the thirty. The page already says so; a forged
  // POST gets the same nothing.
  if (!row) redirect("/claim");

  await db
    .update(builders)
    .set({
      developedLine,
      displayName: displayName || null,
      contact: contact || null,
      claimedAt: row.claimedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(builders.handle, login));

  // Aggregate only, first claim only. Edits are not growth.
  if (!row.claimedAt) {
    try {
      await db.insert(events).values({ kind: "claim" });
    } catch {
      // counting is never load-bearing
    }
  }

  refresh(login);
  redirect(`/b/${login}`);
}

export async function removeCard(): Promise<void> {
  const login = await requireLogin();

  await db
    .update(builders)
    .set({ optedOut: true, updatedAt: new Date() })
    .where(eq(builders.handle, login));

  refresh(login);
  redirect("/claim?removed=1");
}

/**
 * The inverse of removal, available only to the person themselves. Restores
 * the card to whatever state it held — latent if never claimed, developed if
 * it was. Consent runs both directions.
 */
export async function restoreCard(): Promise<void> {
  const login = await requireLogin();

  await db
    .update(builders)
    .set({ optedOut: false, updatedAt: new Date() })
    .where(eq(builders.handle, login));

  refresh(login);
  redirect("/claim");
}

export async function signInWithGithub(): Promise<void> {
  await signIn("github", { redirectTo: "/claim" });
}

export async function signOutOfClaim(): Promise<void> {
  await signOut({ redirectTo: "/claim" });
}
