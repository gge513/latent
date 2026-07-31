import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getBuilder } from "@/lib/builders";

/**
 * The share card. Highest leverage per hour in the whole plan (BUILD-PLAN §7):
 * the growth loop is "you claim → you share → your contacts see a developed
 * card", and a card that does not unfurl is a growth loop that does not exist.
 *
 * Uses the file convention rather than a hand-rolled /api/og route so Next
 * writes the og:image, dimension and type tags itself. One less thing that can
 * silently be wrong in the <head>.
 *
 * Satori only reads ttf/otf/woff, so these are static TrueType cuts of the same
 * two families the site self-hosts as woff2.
 */

export const alt = "A builder on Latent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BASE = "#181310";
const INK = "#ede5d8";
const SAFELIGHT = "#df6432";

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const builder = await getBuilder(handle);

  const [serif, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/newsreader-400.ttf")),
    readFile(join(process.cwd(), "assets/plexmono-400.ttf")),
  ]);

  const name = builder?.displayName ?? `@${handle}`;
  const line =
    builder?.developedLine ??
    builder?.latentLine ??
    "One of thirty builders.";
  const developed = Boolean(builder?.developedLine);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BASE,
          color: INK,
          padding: "72px 80px",
          fontFamily: "Newsreader",
        }}
      >
        <div
          style={{
            fontFamily: "Plex",
            fontSize: 26,
            letterSpacing: 4,
            display: "flex",
            // Latent and developed are the same colour at different opacity.
            opacity: developed ? 0.75 : 0.45,
          }}
        >
          {name.toUpperCase()}
        </div>

        {/* The line carries the card, so it holds the centre of the frame. */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            fontSize: 52,
            lineHeight: 1.28,
            opacity: developed ? 1 : 0.62,
          }}
        >
          {truncate(line, 190)}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "Plex",
            fontSize: 22,
            letterSpacing: 3,
          }}
        >
          {/* The wordmark on the left, the card's state on the right, so the
              product name and the state word never read as the same label. */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: SAFELIGHT,
                marginRight: 14,
              }}
            />
            <div style={{ display: "flex", opacity: 0.65 }}>LATENT</div>
          </div>
          <div style={{ display: "flex", opacity: 0.5 }}>
            {developed ? "IN THEIR OWN WORDS" : "NOT YET DEVELOPED"}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: serif, weight: 400, style: "normal" },
        { name: "Plex", data: mono, weight: 400, style: "normal" },
      ],
    }
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = cut.lastIndexOf(" ");
  return `${cut.slice(0, stop > 60 ? stop : max)}…`;
}
