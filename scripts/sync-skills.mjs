#!/usr/bin/env node
/**
 * sync-skills.mjs — vendor a curated, searchable agent-skill library into ./skills
 *
 * Sources are sparse-cloned into .skills-src (a cache outside the repo), each SKILL.md is
 * parsed, categorised, de-duplicated and copied with its small supporting files.
 * Outputs:
 *   skills/<category>/<slug>/...      the skill itself (SKILL.md + references/scripts)
 *   skills/index.json                 machine-readable index (search this first)
 *   skills/CATALOG.md                 human-readable catalog, grouped by category
 *   skills/sources.json               provenance for every imported skill
 *
 * Usage:
 *   node scripts/sync-skills.mjs            # full sync
 *   node scripts/sync-skills.mjs --dry      # report only, write nothing
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.env.SKILLS_CACHE || path.resolve(ROOT, "..", ".skills-src");
const OUT = path.join(ROOT, "skills");
const DRY = process.argv.includes("--dry");

/* ------------------------------------------------------------------ sources */

/**
 * repo              GitHub owner/name
 * sparse            paths to materialise (omit = whole repo)
 * category          default bucket for skills from this repo
 * prefix            optional slug prefix (keeps names readable/unique)
 */
const SOURCES = [
  // ---------- creative / frontend reference repos -------------------
  { repo: "ruucm/shadergradient", sparse: ["packages/shadergradient/src"], category: "motion", reference: true, prefix: "shadergradient" },
  { repo: "collidingScopes/liquid-logo", sparse: ["README.MD", "index.html", "main.js", "shaders.js", "fragment-shader.glsl", "vertex-shader.glsl", "presets.js", "gui-controls.js"], category: "motion", reference: true, prefix: "liquid-logo" },
  { repo: "paper-design/liquid-logo", sparse: ["src", "README.md", "package.json"], category: "motion", reference: true, prefix: "paper-liquid-logo" },
  { repo: "oso95/scroll-world", sparse: ["skills"], category: "motion" },
  { repo: "dashersw/liquid-glass-js", sparse: ["container.js", "button.js", "glass.css", "README.md"], category: "design-system", reference: true, prefix: "liquid-glass" },
  { repo: "pmndrs/react-three-fiber", sparse: ["docs"], category: "three-d", reference: true, prefix: "r3f" },

  // ---------- agent skill libraries ----------------------------------
  { repo: "obra/superpowers", sparse: ["skills"], category: "process" },
  { repo: "obra/superpowers-chrome", sparse: ["skills"], category: "testing" },
  { repo: "obra/the-elements-of-style", sparse: ["skills"], category: "writing" },
  { repo: "TechyMT/claude-code-superpowers", sparse: ["skills"], category: "process" },

  { repo: "anthropics/skills", sparse: ["skills"], category: "creative" },
  { repo: "vercel-labs/agent-skills", sparse: ["skills"], category: "frontend" },
  { repo: "nextlevelbuilder/ui-ux-pro-max-skill", sparse: [".claude/skills"], category: "design" },
  { repo: "shadcn-ui/ui", sparse: ["skills"], category: "design-system" },
  { repo: "vercel/next.js", sparse: ["skills"], category: "frontend" },
  { repo: "antfu/skills", sparse: ["skills"], category: "frontend" },
  { repo: "DeckardGer/tanstack-agent-skills", sparse: ["skills"], category: "frontend" },
  { repo: "astrolicious/agent-skills", sparse: ["skills"], category: "frontend" },
  { repo: "emilkowalski/skills", sparse: ["skills"], category: "motion" },
  { repo: "remotion-dev/skills", sparse: ["skills"], category: "motion" },
  { repo: "microsoft/playwright-cli", sparse: ["skills"], category: "testing" },

  // ---------- auth / data / payments --------------------------------
  { repo: "clerk/skills", sparse: ["skills"], category: "auth" },
  { repo: "better-auth/skills", sparse: ["skills"], category: "auth" },
  { repo: "firebase/agent-skills", sparse: ["skills"], category: "backend" },
  { repo: "supabase/agent-skills", sparse: ["skills"], category: "backend" },
  { repo: "neondatabase/agent-skills", sparse: ["skills"], category: "data" },
  { repo: "mongodb/agent-skills", sparse: ["skills"], category: "data" },
  { repo: "convex/agent-skills", sparse: ["skills"], category: "data" },
  { repo: "redis/agent-skills", sparse: ["skills"], category: "data" },
  { repo: "stripe/ai", sparse: ["skills"], category: "payments" },
  { repo: "dodopayments/skills", sparse: ["skills"], category: "payments" },
  { repo: "polarsource/agent-toolkit", sparse: ["skills"], category: "payments" },

  // ---------- platform / ops ----------------------------------------
  { repo: "wshobson/agents", sparse: ["plugins/backend-development/skills", "plugins/database-design/skills", "plugins/python-development/skills", "plugins/developer-essentials/skills"], category: "backend" },
  { repo: "docker/skills", sparse: ["skills"], category: "devops" },
  { repo: "LukasNiessen/kubernetes-skill", sparse: ["skills"], category: "devops" },
  { repo: "getsentry/skills", sparse: ["skills"], category: "devops" },
  { repo: "huggingface/skills", sparse: ["skills"], category: "ai" },
  { repo: "OpenRouterTeam/skills", sparse: ["skills"], category: "ai" },
  { repo: "callstackincubator/agent-skills", sparse: ["skills"], category: "mobile" },
  { repo: "expo/skills", sparse: ["plugins/expo/skills"], category: "mobile" },
  { repo: "sveltejs/ai-tools", sparse: ["tools/skills"], category: "frontend" },
  { repo: "trailofbits/skills", sparse: ["plugins"], category: "security" },

  // ---------- growth / comms ----------------------------------------
  { repo: "twilio/ai", sparse: ["skills"], category: "comms" },
  { repo: "resend/resend-skills", sparse: ["skills"], category: "comms" },
  { repo: "coreyhaines31/marketingskills", sparse: ["skills"], category: "marketing" },
  { repo: "PostHog/skills", sparse: ["skills/posthog", "skills/team"], category: "marketing" },
  { repo: "firecrawl/skills", sparse: ["skills"], category: "research" },
  { repo: "browserbase/skills", sparse: ["skills"], category: "research" },
  { repo: "vercel-labs/agent-browser", sparse: ["skills"], category: "research" },
  { repo: "Jeffallan/claude-skills", sparse: ["skills"], category: "process" },
];

/* ------------------------------------------------------------- categorising */

const CATEGORY_LABELS = {
  "process": "Process & workflow (planning, debugging, TDD, review)",
  "design": "Visual design & UX",
  "design-system": "Design systems, components & UI libraries",
  "motion": "Motion, animation, WebGL, shaders & scroll",
  "three-d": "3D / three.js / react-three-fiber",
  "frontend": "Frontend frameworks, rendering & performance",
  "backend": "Backend, APIs & server patterns",
  "data": "Databases, schemas & data modelling",
  "auth": "Authentication & identity",
  "payments": "Payments, billing & monetisation",
  "testing": "Testing, QA & browser automation",
  "devops": "Deploy, containers, observability",
  "security": "Security, crypto & supply chain",
  "mobile": "Mobile & native (React Native, Expo, Swift)",
  "ai": "AI/LLM integration & agents",
  "marketing": "Marketing, growth & analytics",
  "comms": "Email, SMS & messaging",
  "research": "Web research, scraping & browsing",
  "writing": "Writing & prose quality",
  "creative": "Creative production (art, docs, slides, brand)",
  "documents": "Document formats (pdf, docx, xlsx, pptx)",
};

/**
 * Name rules are matched against the skill NAME only (hyphens normalised to spaces,
 * padded with spaces) so "scenarios" never matches "ios" and "pricing" never matches
 * an unrelated body paragraph. First match wins, so order = priority.
 */
const NAME_RULES = [
  [/ (pdf|docx|pptx|xlsx|slides|spreadsheet|office|word doc|powerpoint) /, "documents"],
  [/ (shadcn|radix|base ui|component library|design system|tailwind|ui library|figma) /, "design-system"],
  [/ (animate|animation|motion|transitions?|view transitions?|micro interactions?|shader|shaders|webgl|three|r3f|glsl|scroll|gradient|liquid logo|liquid glass|remotion|video|spline) /, "motion"],
  [/ (react native|expo|swift|swiftui|android|flutter) /, "mobile"],
  [/ (playwright|vitest|jest|cypress|e2e|testing|test|qa|browser automation) /, "testing"],
  [/ (docker|kubernetes|kube|helm|terraform|deploy|deployment|sentry|observability|github actions|ci cd|incident) /, "devops"],
  [/ (security|secure|fuzz|fuzzing|crypto|cryptography|audit|vulnerability|threat|supply chain|secrets|exploit) /, "security"],
  [/ (postgres|postgresql|sql|database|db |schema|redis|mongo|mongodb|convex|neon|sqlite|drizzle) /, "data"],
  [/ (auth|authentication|oauth|session|clerk|login|identity|better auth|passkey) /, "auth"],
  [/ (stripe|payment|payments|billing|checkout|pricing|invoice|polar|dodo|subscription) /, "payments"],
  [/ (twilio|resend|email|sms|whatsapp|notification|messaging|voice) /, "comms"],
  [/ (seo|marketing|growth|ads|advertising|copy writing|copywriting|landing page|conversion|analytics|experiment|funnel|campaign|posthog|content marketing|social) /, "marketing"],
  [/ (scrape|scraping|crawl|crawler|browse|browsing|research|firecrawl|browserbase) /, "research"],
  [/ (mcp|llm|prompt|prompting|claude|openai|hugging|openrouter|rag|embedding|fine tun|agents? sdk) /, "ai"],
  [/ (ux|ui|design|brand|color|typography|layout|accessibility|aesthetic|art direction|visual) /, "design"],
  [/ (react|nextjs|next js|vue|svelte|astro|tanstack|remix|router|frontend|bundl|cache|prefetch|composition|rsc|server components) /, "frontend"],
  [/ (tdd|debug|debugging|plan|planning|brainstorm|review|refactor|git|worktree|skill|workflow|orchestrat|handoff|spec|requirements|retro) /, "process"],
  [/ (write|writing|prose|essay|style|editing|copy edit|docs writing) /, "writing"],
];

const REPO_CATEGORY = Object.fromEntries(SOURCES.map((s) => [s.repo, s.category]));

function categorise(name, description, repo, fallback) {
  const norm = ` ${String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  for (const [re, cat] of NAME_RULES) if (re.test(norm)) return cat;
  return fallback || REPO_CATEGORY[repo] || "process";
}

/* --------------------------------------------------------------- frontmatter */

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };
  const yaml = raw.slice(3, end);
  const body = raw.slice(raw.indexOf("\n", end + 1) + 1);
  const data = {};
  const lines = yaml.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, rest] = m;
    let value = rest.trim();
    if (/^[>|][+-]?$/.test(value)) {
      const block = [];
      while (i + 1 < lines.length && (/^\s{2,}/.test(lines[i + 1]) || lines[i + 1].trim() === "")) {
        block.push(lines[++i].trim());
      }
      value = value.startsWith("|") ? block.join("\n").trim() : block.join(" ").replace(/\s+/g, " ").trim();
    } else if (/^\[.*\]$/.test(value)) {
      value = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }
    data[key] = value;
  }
  return { data, body };
}

/* ------------------------------------------------------------------ file walk */

const SKIP = /(^|\/)(\.git|node_modules|\.github|dist|build|\.next|coverage|schemas|sample-data)(\/|$)/;
const BIN = /\.(png|jpe?g|gif|webp|avif|mp4|mov|webm|mp3|wav|woff2?|ttf|otf|zip|tgz|pdf|pyc|so|dylib|exe|DS_Store)$/i;
const MAX_FILE = 200 * 1024;
const MAX_SKILL = 600 * 1024;

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

function clone(repo, sparse) {
  const dir = path.join(CACHE, repo.replace("/", "__"));
  if (fs.existsSync(path.join(dir, ".git"))) return dir;
  fs.mkdirSync(CACHE, { recursive: true });
  const base = ["clone", "--depth", "1", "--filter=blob:none", "--sparse", `https://github.com/${repo}.git`, dir];
  try {
    execFileSync("git", base, { stdio: "pipe" });
  } catch (err) {
    console.warn(`  ! clone failed ${repo}: ${String(err.stderr || err).slice(0, 200)}`);
    return null;
  }
  try {
    execFileSync("git", ["sparse-checkout", "set", ...(sparse || [])], { cwd: dir, stdio: "pipe" });
  } catch {
    console.warn(`  ! sparse set failed for ${repo} (paths may have moved upstream) — using full tree`);
    execFileSync("git", ["sparse-checkout", "disable"], { cwd: dir, stdio: "pipe" });
  }
  return dir;
}

/* --------------------------------------------------------------------- main */

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

async function main() {
  const skills = [];
  const seenHash = new Map();
  const seenSlug = new Map();
  const stats = [];

  if (!DRY) await fsp.mkdir(OUT, { recursive: true });

  for (const src of SOURCES) {
    const [owner, name] = src.repo.split("/");
    const dir = DRY ? path.join(CACHE, src.repo.replace("/", "__")) : clone(src.repo, src.sparse);
    if (!dir || !fs.existsSync(dir)) {
      console.warn(`  ! missing ${src.repo}`);
      continue;
    }
    const files = await walk(dir);
    const skillFiles = files.filter((f) => path.basename(f) === "SKILL.md" && !f.includes(".skills-src/" + "x"));
    let imported = 0;

    for (const skillFile of skillFiles) {
      const skillDir = path.dirname(skillFile);
      const raw = await fsp.readFile(skillFile, "utf8");
      const { data } = parseFrontmatter(raw);
      const dirName = path.basename(skillDir);
      const rawName = (data.name && String(data.name)) || dirName;
      let description = String(data.description || "").replace(/\s+/g, " ").trim();
      if (!description) {
        const heading = raw.split("\n").find((l) => l.startsWith("# "));
        description = heading ? heading.slice(2).trim() : rawName;
      }
      description = description.slice(0, 600);

      const hash = createHash("sha1").update(raw.replace(/\s+/g, " ")).digest("hex");
      if (seenHash.has(hash)) {
        seenHash.get(hash).dupes.push(src.repo);
        continue;
      }

      let slug = slugify(rawName) || slugify(dirName);
      if (seenSlug.has(slug)) {
        const other = seenSlug.get(slug);
        if (other.hash !== hash) slug = `${slug}-${slugify(owner)}`;
        let n = 2;
        while (seenSlug.has(slug) && seenSlug.get(slug).hash !== hash) slug = `${slug.replace(/-\d+$/, "")}-${n++}`;
      }

      const category = categorise(rawName, description, src.repo, src.category);
      const destDir = path.join(OUT, category, slug);

      // copy supporting files (bounded)
      const inner = files.filter((f) => f.startsWith(skillDir + path.sep));
      let bytes = 0;
      const copied = [];
      if (!DRY) await fsp.mkdir(destDir, { recursive: true });
      for (const f of inner) {
        const rel = path.relative(skillDir, f);
        if (rel.startsWith("..")) continue;
        if (BIN.test(f)) continue;
        const st = await fsp.stat(f).catch(() => null);
        if (!st || st.size > MAX_FILE) continue;
        if (bytes + st.size > MAX_SKILL) break;
        bytes += st.size;
        copied.push(rel);
        if (!DRY) {
          await fsp.mkdir(path.dirname(path.join(destDir, rel)), { recursive: true });
          await fsp.copyFile(f, path.join(destDir, rel));
        }
      }

      const entry = {
        name: rawName,
        slug,
        description,
        category,
        tags: Array.from(new Set(`${rawName} ${description}`.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []))
          .filter((t) => !STOP.has(t))
          .slice(0, 12),
        source: src.repo,
        sourcePath: path.relative(dir, skillFile),
        path: `skills/${category}/${slug}/SKILL.md`,
        files: copied.length,
        bytes,
        dupes: [],
      };
      seenHash.set(hash, entry);
      seenSlug.set(slug, { hash });
      skills.push(entry);
      imported++;
    }
    stats.push({ repo: src.repo, imported });
    console.log(`  ${String(imported).padStart(4)}  ${src.repo}`);
  }

  // reference repos: copy as study material, not as skills
  const references = [];
  for (const src of SOURCES.filter((s) => s.reference)) {
    const dir = path.join(CACHE, src.repo.replace("/", "__"));
    if (!fs.existsSync(dir)) continue;
    const files = await walk(dir);
    let copied = 0;
    for (const f of files) {
      const rel = path.relative(dir, f);
      if (!/\.(glsl|js|ts|tsx|css|md|json|jsx)$/i.test(rel)) continue;
      const st = await fsp.stat(f).catch(() => null);
      if (!st || st.size > MAX_FILE) continue;
      if (rel.split(path.sep).includes(".git")) continue;
      const dest = path.join(OUT, "_references", src.prefix, rel);
      if (!DRY) {
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.copyFile(f, dest);
      }
      copied++;
    }
    references.push({ repo: src.repo, prefix: src.prefix, files: copied, path: `skills/_references/${src.prefix}` });
    console.log(`  ref  ${String(copied).padStart(4)}  ${src.repo}`);
  }

  skills.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  for (const r of references) {
    skills.push({
      name: r.prefix,
      slug: r.prefix,
      description: `Reference source for ${r.repo} — study these files for technique, there is no SKILL.md.`,
      category: "_references",
      tags: r.prefix.split("-"),
      source: r.repo,
      sourcePath: "",
      path: `${r.path}/`,
      files: r.files,
      bytes: 0,
      dupes: [],
      kind: "reference",
    });
  }

  if (!DRY) {
    await fsp.writeFile(path.join(OUT, "index.json"), JSON.stringify({ generated: new Date().toISOString(), count: skills.length, skills }));
    await fsp.writeFile(
      path.join(OUT, "sources.json"),
      JSON.stringify({ generated: new Date().toISOString(), sources: stats, references }, null, 1)
    );
    await fsp.writeFile(path.join(OUT, "CATALOG.md"), renderCatalog(skills, references));
  }

  const byCat = skills.reduce((a, s) => ((a[s.category] = (a[s.category] || 0) + 1), a), {});
  console.log(`\nTOTAL ${skills.length} skills, ${references.length} reference sets`);
  console.log(Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
  if (DRY) console.log("\n(dry run — nothing written)");
}

const STOP = new Set(
  ("the and for with that this from your you are can will use using when used its you'll it's into not but all any how what" +
    " has have been was were will would should could more most such than then there their them they these those also very just" +
    " about above after again against each few other some only own same too over under once here both because while during before" +
    " between out off then than now via per set get new add one two pro max").split(/\s+/)
);

function renderCatalog(skills, references) {
  const cats = [...new Set(skills.map((s) => s.category))].sort();
  const lines = [
    "# Skill Catalog",
    "",
    `${skills.length} skills imported from ${new Set(skills.map((s) => s.source)).size} upstream repositories.`,
    "This file is generated by `node scripts/sync-skills.mjs` — edit the script, not the catalog.",
    "",
    "**How to use:** search `skills/index.json` (or run `node scripts/find-skill.mjs <query>`) for the few skills",
    "that match the task, then read only those `SKILL.md` files. Never bulk-load the library.",
    "",
    "## Contents",
    "",
    ...cats.map((c) => `- [${c}](#${c}) — ${skills.filter((s) => s.category === c).length} skills`),
    "",
  ];
  for (const cat of cats) {
    lines.push(`## ${cat}`, "", `_${CATEGORY_LABELS[cat] || cat}_`, "");
    for (const s of skills.filter((x) => x.category === cat)) {
      const desc = s.description.replace(/\|/g, "\\|").slice(0, 200);
      lines.push(`- **${s.name}** — ${desc}`, `  <sub>\`${s.path}\` · ${s.source}</sub>`);
    }
    lines.push("");
  }
  if (references.length) {
    lines.push("## _references — study material", "", "Source code from the visual-reference repositories, kept for technique study.", "");
    for (const r of references) lines.push(`- **${r.prefix}** — ${r.files} files · ${r.repo} · \`${r.path}\``);
    lines.push("");
  }
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
