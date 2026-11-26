const BASE = "http://localhost:3000";
const seen = new Map();
const queue = ["/"];
const bad = [];
const LIMIT = 120;
while (queue.length && seen.size < LIMIT) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  let res, text;
  try {
    res = await fetch(BASE + path, { redirect: "follow" });
    text = await res.text();
  } catch (e) { bad.push([path, "FETCH " + e.message]); seen.set(path, 0); continue; }
  seen.set(path, res.status);
  if (res.status >= 400) { bad.push([path, res.status]); continue; }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) continue;
  for (const m of text.matchAll(/href="([^"#?]*)(?:[^"]*)?"/g)) {
    let h = m[1];
    if (!h || h.startsWith("mailto:") || h.startsWith("http") || h.endsWith(".xml") || h.endsWith(".txt")) continue;
    if (!h.startsWith("/")) continue;
    if (!seen.has(h) && !queue.includes(h)) queue.push(h);
  }
}
console.log("crawled", seen.size, "routes");
const byStatus = {};
for (const [p, s] of seen) byStatus[s] = (byStatus[s] || 0) + 1;
console.log("statuses:", JSON.stringify(byStatus));
console.log("--- broken ---");
bad.forEach(([p, s]) => console.log(s, p));
