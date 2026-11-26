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
  tagline: "Ten specimens, drawn in the browser",
  description:
    "A studio of ten impossible flowers, cut in glass and gold. One continuous 3D film you scroll through, then a composer: every petal is drawn from numbers in your browser and the link is the whole recipe — no account, no upload, no two ever alike.",
  url: resolveSiteUrl(),
  /** Placeholder contact — replace with the real studio address before launch. */
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "studio@flora-synth.studio",
  location: "Lagos · Berlin",
  year: new Date().getFullYear(),
  // The film owns `/`; these are the instrument's own pages, so every href is a
  // real route rather than an anchor that only exists on one of them.
  nav: [
    { label: "The film", href: "/" },
    { label: "Compose", href: "/compose" },
    { label: "The studio", href: "/studio" },
    { label: "The garden", href: "/collection" },
    /* the gift flow is the front door for anyone who arrived to send something */
    { label: "Send", href: "/send" },
  ],
  socials: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Are.na", href: "https://are.na" },
    { label: "GitHub", href: "https://github.com" },
  ],
};
