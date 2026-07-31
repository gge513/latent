import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { siteUrl } from "@/lib/site";

const newsreader = localFont({
  src: [
    {
      path: "./fonts/newsreader-normal-200-800.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "./fonts/newsreader-italic-200-800.woff2",
      weight: "200 800",
      style: "italic",
    },
  ],
  variable: "--font-newsreader",
});

const plexMono = localFont({
  src: [
    { path: "./fonts/plexmono-normal-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plexmono-normal-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plexmono-italic-400.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-plex-mono",
});

/**
 * metadataBase is what turns relative og:image paths into the absolute URLs
 * Slack and LinkedIn require. Without it every share card resolves against
 * localhost and silently fails to unfurl.
 */

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Latent",
  description: "Thirty builders, developing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
