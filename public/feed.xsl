<?xml version="1.0" encoding="UTF-8"?>
<!--
  A browser opening feed.xml is a person, not a reader application, and it was
  being handed raw XML. This transforms the same document into a readable page
  for them. Feed readers ignore the stylesheet instruction entirely and parse
  the RSS underneath, so nothing about the feed itself changes.

  Progressive enhancement, and the failure mode is the status quo: if a browser
  does not apply XSLT, the visitor sees the raw XML they would have seen anyway.

  The palette is inlined because a stylesheet transform cannot reach the app's
  CSS. Values are copied from globals.css and must be changed with it:
  base #181310, ink #ede5d8, safelight #df6432, latent opacity 0.28. Body text
  sits at 0.55 rather than lower, which is this codebase's measured contrast
  floor (5.18:1 over base; 0.28 is 2.25:1 and fails).
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/rss/channel">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="title"/></title>
        <style>
          :root {
            --base: #181310;
            --ink: #ede5d8;
            --safelight: #df6432;
            --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: var(--base);
            color: var(--ink);
            font-family: var(--mono);
            line-height: 1.7;
            -webkit-font-smoothing: antialiased;
          }
          .wrap { max-width: 42rem; margin: 0 auto; padding: 6rem 1.5rem; }
          .eyebrow {
            font-size: 0.75rem; letter-spacing: 0.2em; text-transform: lowercase;
            opacity: 0.28; margin: 0 0 0.75rem;
          }
          h1 { font-size: 1.5rem; font-weight: 400; margin: 0 0 0.75rem; }
          .lede { opacity: 0.7; margin: 0 0 0.5rem; }
          .note { font-size: 0.75rem; opacity: 0.55; margin: 0; }
          .note code {
            background: rgba(237,229,216,0.08); padding: 0.1rem 0.35rem;
          }
          ol { list-style: none; padding: 0; margin: 4rem 0 0; }
          li { margin: 0 0 3rem; border-left: 1px solid rgba(237,229,216,0.25); padding-left: 1.25rem; }
          .date { font-size: 0.75rem; letter-spacing: 0.15em; opacity: 0.55; }
          h2 { font-size: 1.05rem; font-weight: 400; margin: 0.5rem 0; }
          a { color: inherit; text-decoration: underline; text-underline-offset: 4px; }
          a:hover { color: var(--safelight); }
          .body { white-space: pre-wrap; opacity: 0.55; font-size: 0.9rem; margin: 0; }
          footer { margin-top: 5rem; font-size: 0.75rem; opacity: 0.55; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="eyebrow">rss feed</p>
          <h1><xsl:value-of select="title"/></h1>
          <p class="lede"><xsl:value-of select="description"/></p>
          <p class="note">
            This is a feed. Paste this page's address into a reader to follow
            it, or <a href="{link}">read the stream on the site</a>.
          </p>

          <ol>
            <xsl:for-each select="item">
              <li>
                <div class="date"><xsl:value-of select="substring(pubDate, 6, 11)"/></div>
                <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
                <p class="body"><xsl:value-of select="description"/></p>
              </li>
            </xsl:for-each>
          </ol>

          <footer>
            <a href="{link}">back to the stream</a>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
