# Flora-Synth

A botanical studio: one continuous 3D film you scroll through, then an instrument that
composes ten procedurally drawn specimens into a bouquet — encoded entirely in the URL.

**No accounts. No uploads. No stored bouquets.** A link *is* a bouquet.

Nothing is for sale. There are no prices, plans, bags or checkout: the film opens a bouquet
over three days of window light, and the composer seals a link rather than an order.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

---

## What it is

The film owns `/`; the instrument it replaced still runs, unchanged, on its own routes.

| Surface | Route | What it does |
|---|---|---|
| **The film** | `/` | The front door. Scroll drives one clock: a bouquet opens over three days, sheds its petals, goes under the lens into an anemone's stamens, then steps through all ten specimens and into the composer |
| **Specimen plates** | `/specimen/[slug]` | One page per plant: its own case, its record, and a door into the composer pre-loaded with it |
| **Instrument** | `/compose` | The live 3D bouquet you can regenerate, restyle and share |
| **Algorithmic botany** | `/plot` | The same mesh twice — wireframe vs. physical render, split by a draggable plane |
| **The studio** | `/studio` | Cross two specimens into a hybrid, listen to the arrangement, export a still, a clip or a printable sheet |
| **The garden** | `/collection` | Compositions saved as links, public and permanent |
| **The bench** | `/bench?bench=1` | Not for visitors: the petal-geometry lab (nine petal values plus bloom), 404 in production unless you ask for it by name |

The film is one renderer and one `requestAnimationFrame`: camera moves, the time-lapse,
the petals, the library rail and every text cue are all written by the same loop in
`lib/stamen/director.ts`. It never adds a light or toggles shadows at runtime — that
recompiles every material and the scroll stutters — and it honours a phone's smaller frame
budget. `?debug` exposes `__stamen.go(chapter, p)`, `__stamen.state()` and `__stamen.perf`;
the director also publishes `window.__floraPerf` every frame for the budget script.

Everything is procedural. There are **no GLTF/GLB files, no HDRI maps, no textures on
disk, and no images of flowers**. Every petal, stem, caustic and reflection is generated
at runtime from numbers.

---

## Decisions (and why)

**Next.js 16 (App Router) over Vite.** The 3D layer is identical either way, but Vitrine
and Instrument benefit from static prerender, server-generated OG cards
(`/api/og` renders the actual bouquet parameters), `sitemap.ts`, `robots.ts` and
first-class Vercel deploys. Confirmed choice with the user.

**three.js + R3F over GLTF/GLB.** GLB would mean shipping megabytes of fixed geometry and
you would be stuck with whatever silhouettes a modeller produced. Procedural geometry gives
every species a *recipe* (`lib/specimens.ts`) that can be re-parameterised, instanced,
animated, and drawn at any resolution. A bouquet of 11 stems costs one geometry per
species, not one model per flower.

**URL-encoded composition first.** `lib/bouquet.ts` turns a config into ~60 characters of
query string: `?seed=k1x2&f=gh-da-va&p=a&a=w&v=f&d=9&b=95&theme=light`. Decoding is a pure
function, so the same link always rebuilds the same bouquet — on any device, forever, with
no database involved. Every feature works from that: the instrument, the studio, the share
link, and the hybrid recipe (`x_<a>_<b>_<seed>`) all read the URL and nothing else.

**Supabase for the garden only, and optional.** The garden feed and the sealed gift links
need somewhere to keep a row, so they use Supabase (a separate schema in an existing
project). That is the *only* server state in the product, and it is strictly additive:
with no credentials configured the app still runs, the garden shows a quiet empty state,
saving is disabled, and every other surface is unaffected. No accounts, no uploads, no
auth — a saved bouquet is addressed by a short code, not by a user.

**Visual direction: a candlelit atelier, lit by one window.** Garnet for love, antique gold for luxury, warm
ivory paper, and a high-contrast serif with a true italic (Cormorant Garamond) against
Schibsted Grotesk for labels. Dark mode is velvet burgundy rather than blue-black. The
glass in the scene is deliberately lit warm with a single cool rim light: that split is
what separates glass from ceramic on a warm ground, and it is why the vessel no longer
reads as a milky pot. Tokens and ornament classes (`.eyebrow`, `.emphasis`, `.seal`,
`.frost`, `.btn-primary`) live in `app/globals.css`.

**Hosting: Vercel.** Native for Next.js, edge caching for the static pages, and the OG route
runs as a serverless function. Netlify would work; Vercel is the shorter path with no
config.

---

## Architecture

```
app/
  layout.tsx            fonts, theme boot, URL sync, metadata
  page.tsx              the film: Stage + chapters + rail, announcements and the essay
  stamen.css            the film's stylesheet, including the reduced-motion essay
  globals.css           the synth design system (tokens → components), incl. @media print
  specimen/[slug]/      one prerendered page per plant + its OG image
  compose/page.tsx      the instrument on its own route
  studio/page.tsx       the composer: hybrids, audio, still/clip/sheet export
  collection/page.tsx   the garden feed
  plot/page.tsx         the botany split
  bench/page.tsx        the petal lab, gated out of production
  gift/[code]/page.tsx  the unboxing, rendered from a saved composition
  sitemap.ts            fifteen URLs: the five surfaces and ten plates
  api/og/route.tsx      share cards generated from the bouquet params
  api/garden/route.ts   GET the feed · POST a new composition
  api/garden/[code]/    GET one · POST a view
components/
  stamen/               the film: Stage, Nav, Hud, Build, Chapters, Care, Loader, Cart,
                        FilmLink (deep links), Shutter (shutter-speed transitions),
                        A11y (chapter rail, live announcements, reduced-motion essay)
  synth/                UI: header, instrument, botany, lab, vitrine, notes, garden,
                        studio, specimen-page, print-sheet, shelf, bench, gift
  three/
    bouquet-scene.tsx   canvas, lighting, camera, motes, backdrop
    bouquet-thumb.tsx   the small canvas the garden and the shelf use as a thumbnail
    flowers/
      geometry.ts       parametric petal, tapered tube, merge + growth channels
      build.ts          species → geometry (one merged mesh per species head)
    materials.ts        physical material recipes + the growth shader injection
    materials/textures.ts  procedural normal + roughness maps
    studio-environment.tsx a photo studio baked into a PMREM env map at runtime
    vessel.tsx          lathed vessel profiles + water line
    ground.tsx          floor + animated caustics + contact shadow
    effects.tsx         tone map → bloom → DOF → aberration → vignette → grain
    lib/                shared GLSL, capability hooks
lib/
  specimens.ts          TEN SPECIES — the botanical data, the Form union and its labels
  hybrids.ts            the breeding engine + the one specimen resolver
  bouquet.ts            RNG, encode/decode, composition, naming
  audio.ts              generative score (Web Audio, no files)
  print.ts              bouquet → binary STL, and the dimensions the sheet prints
  capture.ts            still and clip capture off the live canvas
  share.ts              the share sheet, including the mobile path
  shelf.ts              the device-local shelf (localStorage, 24 slots)
  stamen/               the film: director, room, flora, catalog, cues, live, link, preset
  db.ts                 server-only Supabase client, tables, throttles
  garden.ts             the garden's public contract + submission validation
  store.ts              zustand: config + theme, URL mirroring
scripts/perf.mjs        the frame budget, measured in a real browser
skills/                 840 vendored agent skills, generated by `npm run skills`
                        and gitignored (see skills/README.md)
```

### One rule that bit us: values do not cross the client boundary

A server component may *render* a client component, but it may not *read* a constant out
of one. Importing `{ FORM_LABEL }` from a `"use client"` module yields the client reference,
not the object, so the lookup returns `undefined` and the fallback quietly renders the raw
code — the page looks fine and is wrong. Shared values live in `lib/`, which is why
`FORM_LABEL` sits beside the `Form` union it describes rather than next to the component
that usually prints it.

### The garden, and what it costs

Saving a composition writes one row. Reading it renders the same flower, because the row
stores the bouquet's URL config rather than a picture of it.

- All database access is **server-side**, in route handlers, using the service key. The
  browser never receives a credential, so row-level security stays fully closed — there is
  no anon key in the bundle at all.
- The feed is polled every 20 s rather than subscribed. Realtime would require shipping a
  key to every visitor to watch a list of two dozen rows.
- Submissions are re-decoded and re-encoded on the server, so a stored config is guaranteed
  to resolve to renderable species.
- **With no database configured the app still runs**: the garden shows a quiet empty state,
  and every bouquet remains shareable as a URL. `lib/db.ts` returns `null` rather than
  throwing.

Two environment variables, both optional locally:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service role key>   # server only, never exposed
```

Schema lives in the `flora_*` tables, namespaced so the project can host other products:

```sql
flora_bouquets (code, config, title, species[], palette, arrangement, vessel,
                density, bloom, seed, creator, message, views, created_at)
```

### Living growth

Every petal is tagged with a pivot, a hinge axis, a total opening angle and a delay
(`tagGrowth` in `flowers/geometry.ts`). `materials.ts` injects a vertex-shader rotation
into the stock physical material through three's `#include` hooks, so transmission,
iridescence and sheen all keep working. The rotation is rigid about the petal's own base,
so the normal is rotated by the same matrix and the lighting stays correct as the flower
opens. A whole bouquet unfurls for four floats a vertex and no per-frame CPU work.

### The rendering pipeline

1. **Environment** — `studio-environment.tsx` builds a tiny scene of emissive softbox
   panels (including two thin strip lights and a black card) and captures it with
   `PMREMGenerator`. That is what gives glass its vertical highlights and chrome its
   horizon line, with zero assets.
2. **Geometry** — each species is generated once: petals merged into a single head mesh
   with baked vertex colours, plus a stem curve in bouquet space.
3. **Materials** — `MeshPhysicalMaterial` with real `transmission`, `thickness`, `ior`,
   `dispersion` and `attenuationColor`. Glass is a physical material, not an opacity trick.
4. **Post** — tone mapping happens **once**, in the composer (doing it in the renderer too
   flattens every highlight), then bloom, depth of field, chromatic aberration and grain.

### Performance

- One merged geometry per species, reused by every stem of that species.
- One canvas per surface; `IntersectionObserver` gates the botany/vitrine/thumb canvases.
- `dpr` capped, and an adaptive path in the director steps resolution **down** when frames
  run long and back **up** after twelve clean seconds.
- Render loop pauses on `visibilitychange`; motion respects `prefers-reduced-motion`.
- No network requests after first paint except font files (self-hosted via Fontsource).
- The budget is measured, not asserted:

```bash
npm run perf -- --url http://localhost:3000       # software GL (CI, headless)
npm run perf:prod                                  # against the deployed site
```

`scripts/perf.mjs` opens the page in a real browser, reads `window.__floraPerf`, and exits
non-zero if the film has got slower than it says it is. It checks the 95th-percentile frame
time after the film settles, the draw calls, the triangles and the settled pixel ratio. The
triangle ceiling is set from the measured film (~1.37 M, almost all of it anthers — 150
instanced stamens per head at detail 2) with deliberate small headroom, so it catches a
regression instead of being permanently red.

### Accessibility

- Skip link, `aria-pressed` on every toggle, `aria-modal` menu with focus management and
  Escape, semantic headings, and text alternatives for each canvas region.
- The film carries a fixed six-chapter rail with `aria-current="location"`, and a polite
  live region announces each chapter as it arrives.
- Under `prefers-reduced-motion: reduce` the film does not merely stop animating: the pinned
  scroll narrative is replaced by a static essay — the same six chapters as prose, with the
  rail and the film's chrome hidden.
- WebGL absence degrades to the styled fallback rather than a blank box.
- Hydration is deterministic: the share link is empty on the server and filled on mount.

---

## The ten specimens

Chosen for silhouette, rarity, and how they behave under refraction. Each is described in
`lib/specimens.ts` as a form + finish + petal recipe + palette + weight.

| # | Specimen | Latin | Form | Finish |
|---|---|---|---|---|
| 01 | Ghost Orchid | *Dendrophylax lindenii* | spray | iridescent |
| 02 | King Protea | *Protea cynaroides* | cup | porcelain |
| 03 | Peony | *Paeonia lactiflora* | spiral | porcelain |
| 04 | Garden rose | *Rosa × hybrida* | cup | porcelain |
| 05 | Tulip | *Tulipa gesneriana* | cup | glass |
| 06 | Anemone | *Anemone coronaria* | cup | porcelain |
| 07 | Café au Lait Dahlia | *Dahlia* 'Café au Lait' | spiral | porcelain |
| 08 | Cosmos | *Cosmos bipinnatus* | fan | glass |
| 09 | Ranunculus | *Ranunculus asiaticus* | spiral | glass |
| 10 | Velvet Anthurium | *Anthurium crystallinum* | spathe | iridescent |

Each is addressable at `/specimen/<slug>`, and each slug has a two-letter code
(`SPECIES_CODE` in `lib/specimens.ts`) that is what actually travels in a share link.

Species forms map to builders in `components/three/flowers/build.ts`:
`spiral` (peony, dahlia, ranunculus), `cup` (protea, rose, tulip, anemone),
`spray` (ghost orchid), `fan` (cosmos), `spathe` (anthurium).

---

## Themes

Two complete themes, not a dark filter. `data-theme` on `<html>` swaps six CSS variables,
and the 3D scene independently swaps its backdrop gradient, environment intensity, light
colours, bloom threshold and vignette. Toggle from either header, or pass `?theme=dark`.
The choice sticks: it is written to `localStorage` before first paint, so there is no flash
of the wrong theme.

---

## Sharing, exporting, keeping

- **Share a bouquet** — the URL is the whole recipe. On a phone the share sheet is used
  when the browser has one; the link is copied otherwise.
- **A still, a clip** — the studio captures the live canvas: a PNG at the current frame, or
  a short clip through the opening. The canvas is never tainted, so this needs no server.
- **A sheet to print** — `lib/print.ts` measures the bouquet's real bounding box in
  millimetres and the sheet lays out the OG card, the six dimensions, the recipe and a
  footer on A4. It is portalled into `<body>` and hidden on screen; print CSS shows only it.
- **STL** — the same geometry as binary STL, for anything that will slice it.
- **Keep it** — the shelf is device-local (`localStorage`, 24 slots) and public saving is
  the garden. They are different promises and are labelled differently.

---

## Interaction inventory

- **Regenerate** — new seed, same species (deterministic mulberry32).
- **Curator's choice** — three specimens picked for silhouette.
- **Drag a specimen** from the draggable chip row into the dashed vase → it is added and
  the bouquet regenerates around it.
- **Click a chip** → append that species.
- **Palette / arrangement / vessel / density / opening** — every control is live.
- **The bench** — nine petal numbers and the bloom, scrubbed live, with a copyable recipe
  (`?f=<slug>&petal=<nine values>`) that reopens the exact flower.
- **Orbit** the bouquet (drag), **zoom** (wheel/pinch). Auto-rotates when idle.
- **Botany split** — drag anywhere on the plate to move the clipping plane.
- **Vitrine** — hover or click an entry to swap the subject; add it to the bouquet.
- **The film** — scroll to run the clock; the rail jumps between chapters; `?chapter=`,
  `?bloom=` and `?stem=` make a position a link.

---

## Known limits

- `transmission` + `dispersion` is the most expensive path in three.js. On a low-end phone
  the scene still runs, but the vitrine, botany and thumbnail canvases fall back to lower
  DPR.
- Blooms are stylised, not botanically exact. The recipes are tuned for silhouette at
  small scale; a real specimen has far more asymmetry than six numbers can express.
- The print sheet's wall thickness is **nominal**: petals are single-surface shells, so the
  number describes the species' weight class rather than a measured solid. It is labelled
  as such on the sheet.
- The bench is a development surface. It is gated behind `?bench=1` in production and is
  `noindex`.

---

## Skills

`skills/` holds 840 vendored agent skills from 46 upstream repositories, plus five
reference codebases used for technique study. It is reference material, not a dependency:
nothing in the app imports it, and 56 MB of other people's repositories has no business in
every clone of this one, so the tree is gitignored and generated on demand.

```bash
npm run skills        # materialise ./skills from the 46 upstream repos
npm run skill <term>  # search the index
```

See **[skills/README.md](skills/README.md)** for how to search it and how to contribute
without bulk-loading it.
