import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: true,
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader","--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
// a link that encodes a specific seed and 3 species
await p.goto("http://localhost:3000/compose?seed=k1x2&f=gh-da-va&p=a&a=w&v=f&d=9&b=95&theme=dark", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 6000));
console.log(await p.evaluate(() => {
  const t = document.body.innerText;
  const seedLine = (t.match(/seed\s*([A-Z0-9]+)/i) || [])[0];
  const comp = (t.match(/3 species[^\n]*|Champagne|Rose Gold|Amber|Claret/) || [])[0];
  return JSON.stringify({ seedLine, comp, theme: document.documentElement.dataset.theme, url: location.search.slice(0, 80) });
}));
await b.close();
