import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getEntry } from "@/lib/entries";

/**
 * The share card for an entry — same frame as the builder cards (§7): the
 * title holds the centre, the state words stay mono and quiet. A pasted
 * /developing link that unfurls is the broad engine's distribution working.
 */

export const alt = "An entry on Latent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BASE = "#181310";
const INK = "#ede5d8";
const SAFELIGHT = "#df6432";

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getEntry(slug);

  const [serif, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/newsreader-400.ttf")),
    readFile(join(process.cwd(), "assets/plexmono-400.ttf")),
  ]);

  const title = entry?.title ?? "Developing";
  const kind = entry?.kind ?? "entry";
  const date = entry?.publishedAt.toISOString().slice(0, 10) ?? "";

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
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Plex",
            fontSize: 26,
            letterSpacing: 4,
            opacity: 0.6,
          }}
        >
          <div style={{ display: "flex" }}>DEVELOPING</div>
          <div style={{ display: "flex" }}>{date}</div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            fontSize: 52,
            lineHeight: 1.28,
          }}
        >
          {truncate(title, 190)}
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
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: SAFELIGHT,
                marginRight: 14,
              }}
            />
            LATENT
          </div>
          <div style={{ display: "flex", opacity: 0.6 }}>{kind}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: serif, style: "normal" },
        { name: "Plex", data: mono, style: "normal" },
      ],
    }
  );
}
