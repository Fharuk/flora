const BASE = "http://localhost:3000";
const seeds = ["/", "/compose", "/studio", "/collection", "/plot", "/specimen/peony",
  "/specimen/ghost-orchid", "/specimen/king-protea", "/specimen/garden-rose", "/specimen/tulip",
  "/specimen/anemone", "/specimen/cafe-au-lait-dahlia", "/specimen/cosmos", "/specimen/ranunculus",
  "/specimen/velvet-anthurium", "/sitemap.xml", "/robots.txt"];
const seen = new Map(); const queue = [...seeds]; const bad = [];
while (queue.length && seen.size < 200) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  let res, text;
  try { res = await fetch(BASE + path, { redirect: "follow" }); text = await res.text(); }
  catch (e) { bad.push([path, "FETCH " + e.message]); continue; }
  seen.set(path, res.status);
  if (res.status >= 400) { bad.push([path, res.status]); continue; }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) continue;
  for (const m of text.matchAll(/href="([^"]+)"/g)) {
    let h = m[1].split("#")[0].split("?")[0];
    if (!h.startsWith("/") || h.startsWith("//") || h.startsWith("/_next")) continue;
    if (h.endsWith(".xml") || h.endsWith(".txt") || h.endsWith(".svg")) continue;
    if (!seen.has(h) && !queue.includes(h)) queue.push(h);
  }
}
const byStatus = {};
for (const [, s] of seen) byStatus[s] = (byStatus[s] || 0) + 1;
console.log("crawled", seen.size, "statuses:", JSON.stringify(byStatus));
console.log("--- broken ---"); bad.forEach(([p,s])=>console.log(s,p));
console.log("--- routes ---"); [...seen.keys()].sort().forEach(p=>console.log(seen.get(p), p));
