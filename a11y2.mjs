import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: "new",
  args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
for (const path of ["/", "/compose", "/studio", "/plot", "/specimen/peony"]) {
  const p = await b.newPage();
  await p.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(r => setTimeout(r, 4500));
  const info = await p.evaluate(() => {
    const cs = [...document.querySelectorAll("canvas")];
    return cs.map(c => {
      let n = c, named = null;
      while (n) {
        if (n.getAttribute && (n.getAttribute("role") === "img" || n.getAttribute("aria-hidden") === "true")) {
          named = n.getAttribute("aria-hidden") === "true" ? "aria-hidden" : (n.getAttribute("aria-label") || "role=img no label");
          break;
        }
        n = n.parentElement;
      }
      return named || "UNNAMED";
    });
  });
  console.log(path.padEnd(18), JSON.stringify(info));
  await p.close();
}
await b.close();
