# Flora-Synth

A botanical instrument. Ten rare specimens, rendered as glass and chrome, composed into
bouquets in real time in the browser — and encoded entirely in the URL.

**No accounts. No uploads. No stored bouquets.** A link *is* a bouquet.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

---

## What it is

A single-page WebGL instrument with three surfaces:

| Surface | Route | What it does |
|---|---|---|
| **Instrument** | `/` | A live 3D bouquet you can regenerate, restyle and share |
| **Algorithmic botany** | `/#botany` | The same mesh twice — wireframe vs. physical render, split by a draggable plane |
| **Vitrine** | `/#specimens` | Ten species, each selectable, each addable to the bouquet |

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

**Stateless, URL-encoded composition.** `lib/bouquet.ts` turns a config into ~60 characters
of query string: `?seed=k1x2&f=gh-da-va&p=a&a=w&v=f&d=9&b=95&theme=light`. Decoding is a
pure function, so the same link always rebuilds the same bouquet — on any device, forever,
with no database. Supabase was considered and deliberately deferred; there is a clean seam
for a public gallery later, but it is not needed for the instrument to work.

**Supabase / auth: not used.** You asked for stateless and no authentication. Nothing here
touches a server at runtime.

**Hosting: Vercel.** Native for Next.js, edge caching for the static page, and the OG route
runs as a serverless function. Netlify would work; Vercel is the shorter path with no
config.

---

## Architecture

```
app/
  layout.tsx            fonts, theme boot, URL sync, metadata
  page.tsx              the one page
  globals.css           the whole design system (tokens → components)
  api/og/route.tsx      share cards generated from the bouquet params
components/
  synth/                UI: header, instrument, botany, vitrine, notes
  three/
    bouquet-scene.tsx   canvas, lighting, camera, motes, backdrop
    flowers/
      geometry.ts       parametric petal + tapered tube + merge helpers
      build.ts          species → geometry (one merged mesh per species head)
    materials.ts        physical material recipes (glass / chrome / porcelain / iridescent)
    materials/textures.ts  procedural normal + roughness maps
    studio-environment.tsx a photo studio baked into a PMREM env map at runtime
    vessel.tsx          lathed vessel profiles + water line
    ground.tsx          floor + animated caustics + contact shadows
    effects.tsx         tone map → bloom → DOF → aberration → vignette → grain
    lib/                shared GLSL, capability hooks
lib/
  specimens.ts          TEN SPECIES — the botanical data
  bouquet.ts            RNG, encode/decode, composition, naming
  store.ts              zustand: config + theme, URL mirroring
skills/                 840 vendored agent skills (see skills/README.md)
```

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
- One canvas for the hero; `IntersectionObserver` gates the botany/vitrine canvases.
- `dpr` capped at 1.9 desktop / 1.4 mobile; contact shadows and DOF drop on low-quality.
- Render loop pauses on `visibilitychange`; motion respects `prefers-reduced-motion`
  (which also forces the bouquet to its assembled state instantly).
- No network requests after first paint except font files (self-hosted via Fontsource).

---

## The ten specimens

Chosen for silhouette, rarity, and how they behave under refraction. Each is described in
`lib/specimens.ts` as a form + finish + petal recipe + palette.

| # | Specimen | Latin | Form | Finish |
|---|---|---|---|---|
| 01 | Ghost Orchid | *Dendrophylax lindenii* | spray | iridescent |
| 02 | King Protea | *Protea cynaroides* | cup | porcelain |
| 03 | Gloriosa Lily | *Gloriosa superba* | spike | glass |
| 04 | Bird of Paradise | *Strelitzia reginae* | fan | chrome |
| 05 | Black Hellebore | *Helleborus niger* | cup | porcelain |
| 06 | Cymbidium Orchid | *Cymbidium goeringii* | spray | glass |
| 07 | Café au Lait Dahlia | *Dahlia* 'Café au Lait' | spiral | porcelain |
| 08 | Corpse Flower | *Amorphophallus titanum* | spathe | iridescent |
| 09 | Persian Ranunculus | *Ranunculus asiaticus* | spiral | glass |
| 10 | Velvet Anthurium | *Anthurium crystallinum* | spathe | iridescent |

Species forms map to builders in `components/three/flowers/build.ts`:
`spiral` (dahlia, ranunculus), `cup` (protea, hellebore), `spray` (orchids),
`spike` (gloriosa), `spathe` (arum, anthurium), `fan` (bird of paradise).

---

## Themes

Two complete themes, not a dark filter. `data-theme` on `<html>` swaps six CSS variables,
and the 3D scene independently swaps its backdrop gradient, environment intensity, light
colours, bloom threshold and vignette. Toggle from the header, or pass `?theme=dark`.

---

## Interaction inventory

- **Regenerate** — new seed, same species (deterministic mulberry32).
- **Drag a specimen** from the draggable chip row into the dashed vase → it is added and
  the bouquet regenerates around it.
- **Click a chip** → append that species.
- **Palette / arrangement / vessel / density / opening** — every control is live.
- **Orbit** the bouquet (drag), **zoom** (wheel/pinch). Auto-rotates when idle.
- **Botany split** — drag anywhere on the plate to move the clipping plane.
- **Vitrine** — hover or click an entry to swap the subject; add it to the bouquet.
- **Share** — copies the URL. The URL is the save file.

---

## Accessibility & robustness

- Skip link, `aria-pressed` on every toggle, `aria-modal` menu with focus management and
  Escape, semantic headings, and text alternatives for each canvas region.
- Full `prefers-reduced-motion` support.
- WebGL absence degrades to the styled fallback rather than a blank box.
- Hydration is deterministic: the share link is empty on the server and filled on mount.

---

## Known limits

- `transmission` + `dispersion` is the most expensive path in three.js. On a low-end phone
  the scene still runs, but the vitrine and botany canvases fall back to lower DPR.
- Blooms are stylised, not botanically exact. The recipes are tuned for silhouette at
  small scale; a real specimen has far more asymmetry than six numbers can express.
- No export to PNG/video yet — the canvas is not tainted, so a `toBlob()` button is a
  small addition if you want it.

---

## Skills

`skills/` contains 840 vendored agent skills from 46 upstream repositories, plus five
reference codebases used for technique study. See **[skills/README.md](skills/README.md)**
for how to search it and how to contribute without bulk-loading it.
