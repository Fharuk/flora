#!/usr/bin/env node
/**
 * find-skill.mjs — locate the few skills that matter for a task.
 *
 *   node scripts/find-skill.mjs "liquid glass"
 *   node scripts/find-skill.mjs nextjs cache --category frontend
 *   node scripts/find-skill.mjs shader --json
 *
 * Reads skills/index.json. Prints the best matches with a path you can open.
 * Progressive disclosure: search, open 1–3 SKILL.md files, ignore the rest.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = path.join(ROOT, "skills", "index.json");

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const takeValue = (name) => {
  const i = argv.indexOf(name);
  return i > -1 ? argv[i + 1] : undefined;
};
const category = takeValue("--category");
const limit = Number(takeValue("--limit") || 8);
const json = flags.has("--json");
const VALUE_FLAGS = new Set(["--category", "--limit"]);
const terms = argv
  .filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]))
  .join(" ")
  .toLowerCase()
  .trim();

if (!fs.existsSync(INDEX)) {
  console.error("skills/index.json missing — run `node scripts/sync-skills.mjs` first.");
  process.exit(1);
}

const { skills } = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const words = terms.split(/[^a-z0-9]+/).filter(Boolean);

function score(skill) {
  const name = skill.name.toLowerCase();
  const desc = skill.description.toLowerCase();
  const tags = skill.tags.join(" ");
  let s = 0;
  if (!words.length) return 1;
  if (name === terms) s += 100;
  if (name.replace(/[^a-z0-9]+/g, " ") === terms) s += 80;
  for (const w of words) {
    if (name === w) s += 40;
    else if (name.startsWith(w)) s += 22;
    else if (name.includes(w)) s += 14;
    if (tags.includes(w)) s += 5;
    if (desc.includes(w)) s += 3;
  }
  // reward covering every query word somewhere
  if (words.every((w) => name.includes(w) || tags.includes(w) || desc.includes(w))) s += 12;
  if (category && skill.category !== category) s -= 200;
  if (skill.category === "process") s -= 2;
  return s;
}

const ranked = skills
  .map((s) => ({ ...s, score: score(s) }))
  .filter((s) => s.score > 0)
  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  .slice(0, limit);

if (json) {
  console.log(JSON.stringify(ranked.map(({ score, tags, files, bytes, dupes, ...rest }) => ({ ...rest, score })), null, 2));
} else if (!ranked.length) {
  console.log(`No skill matches "${terms}".`);
  console.log("Try: node scripts/find-skill.mjs --category design   (lists the category)");
} else {
  console.log(`\n${ranked.length} match(es) for "${terms || "everything"}":\n`);
  for (const s of ranked) {
    console.log(`• ${s.name}  [${s.category}]`);
    console.log(`  ${s.description.slice(0, 230)}${s.description.length > 230 ? "…" : ""}`);
    console.log(`  ${s.path}  · via ${s.source}\n`);
  }
  console.log("Open the SKILL.md you need; ignore the rest.");
}
