import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: "new",
  args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const pages = ["/", "/compose", "/studio", "/collection", "/plot", "/specimen/peony"];
for (const path of pages) {
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0,90)); });
  await p.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  const info = await p.evaluate(() => {
    const cs = [...document.querySelectorAll("canvas")];
    const unnamed = cs.filter(c => {
      // a canvas inside a labelled container is fine; a bare one is not
      let n = c, label = c.getAttribute("aria-label") || c.getAttribute("role");
      while (n && !label) { n = n.parentElement; if (n) label = n.getAttribute("aria-label") || n.getAttribute("role"); }
      return !label;
    }).length;
    const imgsNoAlt = [...document.querySelectorAll("img")].filter(i => !i.hasAttribute("alt")).length;
    const buttonsNoName = [...document.querySelectorAll("button")].filter(btn =>
      !btn.textContent.trim() && !btn.getAttribute("aria-label") && !btn.getAttribute("title")).length;
    const inputsNoLabel = [...document.querySelectorAll("input,select")].filter(el => {
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
      return !el.closest("label");
    }).length;
    return { canvases: cs.length, canvasesUnnamed: unnamed, imgsNoAlt, buttonsNoName, inputsNoLabel };
  });
  console.log(path.padEnd(18), JSON.stringify(info), errs.length ? "ERR: " + errs[0] : "");
  await p.close();
}
await b.close();
