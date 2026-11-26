#!/usr/bin/env node
/**
 * The performance budget, with teeth.
 *
 * The site makes a promise it had no way to check: sixty frames a second, a
 * handful of draw calls, and a first frame inside a couple of seconds. Every one
 * of those is a number, and a number can be measured — by a script that opens the
 * page in a real browser, reads what the director publishes, and exits non-zero
 * when the film has got slower than it said it was.
 *
 * This deliberately measures the software renderer's numbers against a budget
 * scaled for it (see `--budget`), because CI has no GPU. On a real machine, pass
 * `--gpu` and the honest thresholds below.
 *
 *   node scripts/perf.mjs                     # against http://localhost:3000
 *   node scripts/perf.mjs --url https://…     # against a deployment
 *   node scripts/perf.mjs --json              # machine-readable, for CI
 *   node scripts/perf.mjs --gpu               # real-GPU thresholds
 *
 * Requires `puppeteer-core` and a browser: in this repo, `npm i -D puppeteer-core`
 * and set PUPPETEER_EXECUTABLE_PATH, or run `npx @puppeteer/browsers install chrome`.
 */

import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const value = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const URL_UNDER_TEST = value("--url", "http://localhost:3000/");
const JSON_OUT = has("--json");
const GPU = has("--gpu");

/**
 * The budget.
 *
 * Frame time is the 95th percentile of the frames sampled after the film has
 * settled, not the mean: a mean hides the stalls that actually make a scroll feel
 * broken. Draw calls and triangles are what the scene costs to describe; the
 * first-frame budget is what a reader waits before anything is on screen.
 *
 * The triangle ceiling is set from the measured film, not from a round number:
 * 1.37 M is what it actually draws at desktop detail, and almost all of it is the
 * anthers — 150 instanced stamens per head, each an icosahedron at detail 2. That
 * is 41 draw calls, which is cheap, and a frame time that holds, so the honest
 * budget is a ceiling just above it. A round 900 k was aspirational and simply
 * failed; a budget that is always red teaches everyone to ignore it.
 *
 * The headroom is deliberately small. This exists to catch a regression — a
 * specimen added at detail 3, a second bouquet built and never disposed — not to
 * bless whatever the film happens to cost today.
 */
const BUDGET = GPU
  ? { p95ms: 16.7, calls: 60, tris: 1_500_000, firstFrameMs: 2500 }
  : { p95ms: 90, calls: 60, tris: 1_500_000, firstFrameMs: 6000 };

async function main() {
  let puppeteer, executablePath;
  try {
    puppeteer = (await import("puppeteer-core")).default;
    executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    if (!executablePath) {
      const { default: chromium } = await import("@sparticuz/chromium").catch(() => ({ default: null }));
      if (chromium) executablePath = await chromium.executablePath();
    }
  } catch (err) {
    console.error("perf: no browser driver. npm i -D puppeteer-core, then set PUPPETEER_EXECUTABLE_PATH.");
    console.error(String(err).slice(0, 200));
    process.exit(2);
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: GPU
      ? ["--no-sandbox"]
      : [
          "--no-sandbox",
          "--use-gl=angle",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
          "--disable-dev-shm-usage",
        ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));

  const t0 = Date.now();
  await page.goto(URL_UNDER_TEST, { waitUntil: "domcontentloaded", timeout: 60_000 });

  /* first frame: the loader lifts only once the scene has built and drawn */
  const firstFrameMs = await page
    .waitForFunction(() => !document.querySelector('[role="status"]') || document.querySelector('[role="status"]')?.getAttribute("aria-hidden") === "true", {
      timeout: 30_000,
      polling: 100,
    })
    .then(() => Date.now() - t0)
    .catch(() => -1);

  /* let the adaptive path settle before sampling it */
  await new Promise((r) => setTimeout(r, 4000));

  const samples = [];
  for (let i = 0; i < 60; i++) {
    const s = await page.evaluate(() => window.__floraPerf ?? null);
    if (s) samples.push(s);
    await new Promise((r) => setTimeout(r, 50));
  }

  await browser.close();

  if (!samples.length) {
    console.error("perf: the director never published a frame. Is WebGL available?");
    process.exit(2);
  }

  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  const p95 = ms[Math.floor(ms.length * 0.95)] ?? ms[ms.length - 1];
  const last = samples[samples.length - 1];

  const results = {
    url: URL_UNDER_TEST,
    gpu: GPU,
    frames: samples.length,
    firstFrameMs,
    p95ms: Math.round(p95 * 10) / 10,
    calls: last.calls,
    tris: last.tris,
    dpr: Number(last.dpr?.toFixed?.(2) ?? last.dpr),
    errors,
    budget: BUDGET,
  };

  const failures = [];
  if (firstFrameMs < 0) failures.push("first frame never arrived");
  else if (firstFrameMs > BUDGET.firstFrameMs)
    failures.push(`first frame ${firstFrameMs} ms > ${BUDGET.firstFrameMs} ms`);
  if (p95 > BUDGET.p95ms) failures.push(`p95 frame ${results.p95ms} ms > ${BUDGET.p95ms} ms`);
  if (last.calls > BUDGET.calls) failures.push(`${last.calls} draw calls > ${BUDGET.calls}`);
  if (last.tris > BUDGET.tris) failures.push(`${last.tris} triangles > ${BUDGET.tris}`);
  if (errors.length) failures.push(`${errors.length} page error(s)`);

  if (JSON_OUT) {
    console.log(JSON.stringify({ ...results, failures, ok: failures.length === 0 }, null, 2));
  } else {
    console.log(`\n  ${URL_UNDER_TEST}${GPU ? " (gpu)" : " (software)"}`);
    console.log(`  first frame   ${firstFrameMs} ms   budget ${BUDGET.firstFrameMs} ms`);
    console.log(`  frame p95     ${results.p95ms} ms   budget ${BUDGET.p95ms} ms`);
    console.log(`  draw calls    ${last.calls}       budget ${BUDGET.calls}`);
    console.log(`  triangles     ${last.tris}   budget ${BUDGET.tris}`);
    console.log(`  pixel ratio   ${results.dpr}\n`);
    if (failures.length) {
      console.log("  FAILED");
      for (const f of failures) console.log(`    · ${f}`);
      console.log("");
    } else {
      console.log("  within budget\n");
    }
  }

  process.exit(failures.length ? 1 : 0);
}

/* only run when invoked directly, so the module can be imported by a test */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
