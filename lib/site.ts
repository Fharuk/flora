/**
 * Canonical origin.
 *
 * Metadata, robots and the Open Graph image all need an absolute URL. Hard-coding a
 * domain we do not own meant every share card pointed at a dead host. Resolution order:
 *
 *   1. NEXT_PUBLIC_SITE_URL — set this once a custom domain is attached.
 *   2. Vercel's production domain — automatic on Vercel, no configuration needed.
 *   3. Vercel's preview/deployment URL — keeps preview share cards working.
 *   4. localhost — development.
 *
 * Everything is resolved at build time, which is what static metadata wants.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production.replace(/\/+$/, "")}`;

  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const synthSite = {
  name: "Flora-Synth",
  wordmark: "Flora-Synth",
  tagline: "A botanical instrument",
  description:
    "Flora-Synth composes bouquets of ten rare specimens in glass and chrome. Every arrangement is generated in real time and encoded in the link — no account, no upload, no two ever alike.",
  url: resolveSiteUrl(),
  /** Placeholder contact — replace with the real studio address before launch. */
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "studio@flora-synth.studio",
  location: "Lagos · Berlin",
  year: new Date().getFullYear(),
  nav: [
    { label: "Instrument", href: "#instrument" },
    { label: "Botany", href: "#botany" },
    { label: "Specimens", href: "#specimens" },
    { label: "Notes", href: "#notes" },
  ],
  socials: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Are.na", href: "https://are.na" },
    { label: "GitHub", href: "https://github.com" },
  ],
};
