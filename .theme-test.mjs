import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: true,
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader","--hide-scrollbars"] });
const cases = [["/?debug", "no param"], ["/?debug&theme=dark", "?theme=dark"], ["/?debug&theme=light", "?theme=light"]];
for (const [path, label] of cases) {
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => window.__stamen, { timeout: 60000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));
  const r = await p.evaluate(() => {
    const el = document.querySelector(".stamen");
    const cs = getComputedStyle(el);
    const nav = document.querySelector("nav") || el;
    return {
      themeAttr: document.documentElement.dataset.theme,
      tone: document.documentElement.dataset.stamenTone,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      stamenInk: cs.getPropertyValue("--stamen-ink").trim(),
      navBg: getComputedStyle(nav).backgroundColor,
    };
  });
  console.log(`${label.padEnd(12)} theme=${String(r.themeAttr).padEnd(5)} tone=${String(r.tone).padEnd(5)} ink=${r.stamenInk} navBg=${r.navBg}`);
  await p.screenshot({ path: `/home/user/tools/theme-${label.replace(/[^a-z]/gi,"")}.png` });
  await p.close();
}
await b.close();
