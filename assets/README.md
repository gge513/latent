# OG card fonts

Static TrueType cuts of the two families the site self-hosts as woff2. Satori
(which renders the share cards) only reads `ttf`, `otf` and `woff`, so the
variable woff2 files in `app/fonts/` cannot be used here.

- `newsreader-400.ttf` — Newsreader Regular, latin subset, from Google Fonts
- `plexmono-400.ttf` — IBM Plex Mono Regular, latin subset, from Google Fonts

Both are licensed under the SIL Open Font License 1.1:
<https://openfontlicense.org/>

Kept small on purpose: `ImageResponse` has a 500KB bundle ceiling that counts
fonts, JSX and CSS together.
