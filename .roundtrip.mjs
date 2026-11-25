import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: true,
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader","--hide-scrollbars"] });

// 1. the film must not have its URL rewritten by the instrument
const f = await b.newPage();
await f.setViewport({ width: 1440, height: 900 });
await f.goto("http://localhost:3000/?debug", { waitUntil: "domcontentloaded" });
await f.waitForFunction(() => window.__stamen, { timeout: 60000 }).catch(()=>{});
await new Promise(r => setTimeout(r, 5000));
const filmUrl = await f.evaluate(() => location.search);
await f.close();

// 2. a shared recipe must open exactly what it encodes, and the copy button
//    must hand back a URL that reloads it
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:3000/compose?seed=k1x2&f=gh-da-va&p=a&a=w&v=f&d=9&b=95&theme=dark", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 5000));
const before = await p.evaluate(() => document.body.innerText.match(/seed\s*([A-Z0-9]+)/i)?.[1]);
// change the seed through the UI store, then read the URL the page wrote
const link = await p.evaluate(async () => {
  const t = document.body.innerText.match(/flora-synth\.app[^\s`]*|\/compose\/\?[^\s`]*/);
  return t ? t[0] : "no link shown";
});
console.log(`film url after load: "${filmUrl}"  ${filmUrl === "" ? "(untouched)" : "(REWRITTEN!)"}`);
console.log(`share link opened seed: ${before}`);
console.log(`link shown on page: ${link.slice(0, 90)}`);
await b.close();
