import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "/tmp/chromium", headless: true,
  args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader","--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000/?theme=light", { waitUntil: "domcontentloaded", timeout: 45000 });
await new Promise(r => setTimeout(r, 11000));
await page.screenshot({ path: "/home/user/tools/m-mobile-hero.png" });
const overflow = await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, winW: window.innerWidth }));
console.log(JSON.stringify(overflow));
await browser.close();
