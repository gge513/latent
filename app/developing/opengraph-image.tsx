import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The stream's own share card, for when /developing itself gets pasted
 * somewhere. Static on purpose: the claim it makes is the page's job
 * description, not its current contents.
 */

export const alt = "Developing · Latent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BASE = "#181310";
const INK = "#ede5d8";
const SAFELIGHT = "#df6432";

export default async function Image() {
  const [serif, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/newsreader-400.ttf")),
    readFile(join(process.cwd(), "assets/plexmono-400.ttf")),
  ]);

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
            fontFamily: "Plex",
            fontSize: 26,
            letterSpacing: 4,
            opacity: 0.6,
          }}
        >
          DEVELOPING
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            fontSize: 56,
            lineHeight: 1.28,
          }}
        >
          What the builders are shipping, written by the site itself.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: "Plex",
            fontSize: 22,
            letterSpacing: 3,
          }}
        >
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
