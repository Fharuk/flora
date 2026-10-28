# Skills

**840 skills, 46 upstream repositories, one index.** This directory is a vendored library of
agent skills (`SKILL.md` files) plus five reference codebases. It exists so that the right
technique is one search away — not so that everything gets loaded into a prompt.

> **Rule: progressive disclosure.** Search first, open 1–3 files, ignore the rest.
> Never read this whole directory into context. It is ~56 MB and would drown the task.

---

## Use it

```bash
npm run skill "liquid glass"            # ranked matches with paths
npm run skill "postgres index" --limit 4
npm run skill -- --category motion      # browse a category
npm run skill "playwright e2e" --json   # machine-readable
```

Then open only what you need:

```bash
less skills/motion/animate/SKILL.md
```

`skills/CATALOG.md` is the human-readable listing. `skills/index.json` is the machine index
(`name`, `slug`, `description`, `category`, `tags`, `source`, `path`).

### Categories

| category | count | covers |
|---|---|---|
| marketing | 104 | growth, SEO, ads, analytics, funnels |
| process | 95 | planning, debugging, TDD, review, refactoring |
| security | 95 | audits, fuzzing, crypto, supply chain |
| data | 62 | Postgres, Mongo, Redis, Convex, schemas |
| comms | 59 | email, SMS, voice, notifications |
| research | 58 | scraping, crawling, browser automation |
| frontend | 54 | Next.js, React, TanStack, Astro, Svelte |
| ai | 48 | LLM integration, prompts, MCP, RAG, agents |
| mobile | 45 | React Native, Expo, SwiftUI |
| devops | 39 | Docker, Kubernetes, deploys, Sentry |
| backend | 34 | API design, server patterns |
| payments | 30 | Stripe, Dodo, Polar, billing |
| motion | 28 | animation, WebGL, shaders, scroll, Remotion |
| auth | 26 | Clerk, Better Auth, sessions, OAuth |
| testing | 19 | Playwright, Vitest, E2E, QA |
| design | 16 | visual design, UX, brand, typography |
| writing | 10 | prose, editing |
| creative | 8 | art direction, slides, docs production |
| design-system | 5 | tokens, components, Radix→Base UI |
| documents | 5 | pdf, docx, xlsx, pptx |

---

## Reference codebases

`skills/_references/` holds source (not skills) from the repos the project was briefed with,
kept because the *techniques* are the value:

| folder | source | what to learn from it |
|---|---|---|
| `shadergradient` | ruucm/shadergradient | mesh-gradient parameters, halftone & post passes |
| `liquid-logo` | collidingScopes/liquid-logo | the flow-field-inside-an-alpha-mask loop |
| `paper-liquid-logo` | paper-design/liquid-logo | the polished variant, presets, export |
| `liquid-glass` | dashersw/liquid-glass-js | backdrop capture → refraction of the *page* |
| `r3f` | pmndrs/react-three-fiber | docs for the renderer used here |

---

## How this was built

`scripts/sync-skills.mjs` is the whole pipeline and is re-runnable:

```bash
npm run skills          # sparse-clone → parse → categorise → dedupe → write index + catalog
npm run skills -- --dry # report only
```

It:

1. **Sparse-clones** each source into `../.skills-src` (a cache **outside** the repo, so a
   failed sparse path can never pollute the checkout) with `--filter=blob:none`.
2. **Parses frontmatter** tolerantly — block scalars (`>-`, `|`), inline arrays, quoted
   strings — because every upstream repo formats `description` differently.
3. **Categorises** by matching the *skill name* (normalised, word-boundary padded) against
   ordered rules, falling back to the repo's declared category. Matching the name rather
   than free text is what stops `scenarios` → mobile and `pricing` → payments.
4. **Dedupes** by SHA-1 of normalised content, so the same skill shipped in two repos is
   imported once. Slug collisions get disambiguated, never overwritten.
5. **Bounds the copy**: skips binaries, `schemas/` and `sample-data/`, caps files at 200 KB
   and each skill at 600 KB, so the library stays reviewable.
6. **Writes** `skills/index.json`, `skills/CATALOG.md` and `skills/sources.json`.

### Adding a source

Append one line to `SOURCES` in `scripts/sync-skills.mjs`:

```js
{ repo: "owner/name", sparse: ["skills"], category: "frontend" },
```

and run `npm run skills`. That's it — no manual copying, no hand-maintained list.

### Attribution

Every imported skill keeps its upstream `LICENSE`/`LICENSE.txt` where one existed, and
`skills/sources.json` records the repo each file came from. These are vendored for
development reference; check the upstream licence before redistributing any of them.
