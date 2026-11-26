# Third-party material

## Lumette LM-25 "Stamen" v1.0.1

The scrolling film on `/` is built from the Lumette "Stamen" kit: its renderer
architecture (`lib/stamen/director.ts`), petal and stem geometry, camera script,
chapter structure and stylesheet are derived from that kit, which is licensed
per-site under a single-seat licence held by the site's owner.

The kit's own licence forbids redistributing its source files. The archive is
therefore **not** in this repository — `google_drive/` is git-ignored — and the
copy here exists only as the deployed site, adapted as described below. If you
are reading this repository and want to use the film for something of your own,
buy the kit from Lumette rather than taking these files.

Adaptations:

- ten specimens instead of six (the kit's six plus Ghost orchid, King protea,
  Café au Lait dahlia and Velvet anthurium), all still fully procedural
- commerce removed: no prices, plans, bag, checkout or delivery copy
- Flora-Synth's garnet/antique-gold palette in place of the kit's magenta
- the stem library's rail is driven by chapter progress rather than per-plate
  camera cues, and the font stack is aliased to the packages this app installs

## Fonts

Cormorant Garamond, Instrument Serif, Schibsted Grotesk and JetBrains Mono
(via `@fontsource`), plus Fraunces and Geist for the film (via
`@fontsource-variable`). All are SIL Open Font License 1.1.

The share cards (`/api/og` and each specimen's `opengraph-image`) cannot reach a
font server at request time, so Fraunces and Geist are also vendored as three
subset `.woff` files in `assets/fonts/` — `og-fraunces.woff`,
`og-fraunces-word.woff` and `og-geist.woff` — read from disk by
`lib/og-card.tsx`. Same licences.

## Libraries

Installed from npm, not vendored. All MIT unless noted.

| Package | What it does here |
|---|---|
| `next`, `react`, `react-dom` | the framework, the app router, the OG image route |
| `three`, `@react-three/fiber`, `@react-three/drei` | the renderer and the R3F binding for it |
| `postprocessing`, `@react-three/postprocessing` | bloom, depth of field, aberration, vignette, grain |
| `motion` | the small UI transitions in the synth surfaces |
| `lenis` | smooth scrolling for the film's scroll clock |
| `zustand` | the synthesizer config store and its URL mirroring |
| `lucide-react` | the icon set |
| `clsx`, `tailwind-merge` | class composition |
| `tailwindcss`, `@tailwindcss/postcss` | the design system's utility layer |
| `@supabase/supabase-js` | the garden — server-side only, and optional |

## Everything else

Every flower, stem, vessel, wrap, shadow and caustic is generated in the browser
from code. There are no model, image, video or audio files in this repository.

`skills/` holds vendored reference material from 46 upstream repositories, each
under its own licence and each carrying its licence file. Nothing in the app
imports it, and the tree is gitignored.

The frames `/scripts/perf.mjs` measures with are Chromium's; the script drives a
browser that already exists on the machine rather than shipping one.
