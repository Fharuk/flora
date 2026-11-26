import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: "new",
  args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.goto("http://localhost:3000/studio", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise(r => setTimeout(r, 5000));
console.log(await p.evaluate(() => [...document.querySelectorAll("input,select")].map(el => {
  const labelled = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") ||
    (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label");
  return { tag: el.tagName, type: el.type, id: el.id || null, labelled: !!labelled,
           html: el.outerHTML.slice(0, 160) };
})));
await b.close();
