import type { Metadata, Viewport } from "next";

import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/schibsted-grotesk/400.css";
import "@fontsource/schibsted-grotesk/500.css";
import "@fontsource/schibsted-grotesk/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

import { ThemeBoot, UrlSync } from "@/components/synth/theme-boot";
import { synthSite } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(synthSite.url),
  title: {
    default: `${synthSite.name} — ${synthSite.tagline}`,
    template: `%s — ${synthSite.name}`,
  },
  description: synthSite.description,
  applicationName: synthSite.name,
  authors: [{ name: synthSite.name, url: synthSite.url }],
  keywords: [
    "procedural flowers",
    "WebGL",
    "three.js",
    "generative design",
    "bouquet generator",
    "glass rendering",
    "react three fiber",
  ],
  openGraph: {
    type: "website",
    url: synthSite.url,
    siteName: synthSite.name,
    title: `${synthSite.name} — ${synthSite.tagline}`,
    description: synthSite.description,
    images: [{ url: "/api/og", width: 1200, height: 630, alt: synthSite.tagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${synthSite.name} — ${synthSite.tagline}`,
    description: synthSite.description,
    images: ["/api/og"],
  },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe9" },
    { media: "(prefers-color-scheme: dark)", color: "#06080a" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <a
          href="#instrument"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-paper"
        >
          Skip to the instrument
        </a>
        <ThemeBoot />
        <UrlSync />
        {children}
      </body>
    </html>
  );
}
