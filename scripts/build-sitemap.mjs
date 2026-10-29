// Writes sitemap.xml from the live inventory so search engines find every item page.
// Run by .github/workflows/sitemap.yml once a day and on every push. No dependencies.
import { readFileSync, writeFileSync } from "node:fs";

const config = readFileSync("assets/config.js", "utf8");
const setting = (key) => (config.match(new RegExp(`${key}:\\s*"([^"]*)"`)) || [])[1] || "";
const site = setting("siteUrl").replace(/\/?$/, "/");
const csvUrl = setting("inventoryCsvUrl");

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

let text;
if (csvUrl) {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Inventory feed returned ${res.status}`);
  text = await res.text();
} else {
  text = readFileSync("data/inventory.csv", "utf8");
}

const items = parseCSV(text).filter((it) => it.id && it.status && !["Draft", "Hidden"].includes(it.status));
const pages = ["", "about.html", "sell.html", "partners.html", "condition.html", "shipping.html", "returns.html", "contact.html"];
const xmlEsc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const urls = [
  ...pages.map((p) => site + p),
  ...items.map((it) => `${site}item.html?id=${encodeURIComponent(it.id)}`),
];
writeFileSync(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${xmlEsc(u)}</loc></url>`).join("\n") +
    `\n</urlset>\n`
);
console.log(`sitemap.xml: ${urls.length} URLs (${items.length} items)`);
