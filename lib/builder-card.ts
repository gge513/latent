/**
 * The shape of a card, and the one rule about which line it carries.
 *
 * Client-safe on purpose: this module must never import the database, because
 * the space renders in the browser. lib/builders.ts holds the server queries
 * and imports from here, never the other way round.
 */

export type SpaceBuilder = {
  handle: string;
  displayName: string | null;
  /** Their words, written at claim. Null until claimed. */
  developedLine: string | null;
  /** Machine-derived from public facts. Always shown as such. */
  latentLine: string | null;
  claimed: boolean;
  x: number;
  y: number;
  languages: string[];
};

/**
 * The one line a card carries. Claimed builders speak for themselves; latent
 * ones get the machine-derived line, and the caller is responsible for
 * marking it as machine-derived on screen.
 */
export function lineFor(b: SpaceBuilder): { text: string; theirs: boolean } | null {
  if (b.developedLine) return { text: b.developedLine, theirs: true };
  if (b.latentLine) return { text: b.latentLine, theirs: false };
  return null;
}
