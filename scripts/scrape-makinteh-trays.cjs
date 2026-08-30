/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node.js maintenance script */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sitemapFile = path.join(root, "Лоток", "catalogs", "Makinteh", "sitemap.xml");
const outputFile = path.join(root, "Лоток", "catalogs", "Makinteh", "Makinteh-EAE-products.json");
const decoder = new TextDecoder("windows-1251");

const decodeEntities = (text) => text
  .replace(/&nbsp;/gi, " ")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, "&")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const sitemap = fs.readFileSync(sitemapFile, "utf8");
const urls = [...sitemap.matchAll(/<loc>(https:\/\/ensaving\.ru\/kabelnyye-lotki\/[^<]+)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url) => !url.includes("/series/") && url.split("/").filter(Boolean).length > 3);

async function parsePage(url) {
  const response = await fetch(url, { headers: { "user-agent": "KLM-Catalog-Indexer/1.0" } });
  if (!response.ok) return null;
  const html = decoder.decode(await response.arrayBuffer());
  const pairs = new Map([...html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)]
    .map((match) => [decodeEntities(match[1]).replace(/:$/, ""), decodeEntities(match[2])]));
  const article = pairs.get("Артикул");
  const model = pairs.get("Наименование");
  if (!article || !model) return null;
  const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? model);
  const conciseTitle = title.split(/\s+купить\s+/i)[0];
  return { manufacturer: "EAE", article, name: `${conciseTitle} (${model})`, family: pairs.get("Серия лотка") ?? "E-Line", source: url };
}

async function main() {
  const rows = [];
  for (let i = 0; i < urls.length; i += 8) {
    const batch = await Promise.all(urls.slice(i, i + 8).map(parsePage));
    rows.push(...batch.filter(Boolean));
    console.log(`Макинтех: ${Math.min(i + 8, urls.length)}/${urls.length}`);
  }

  const unique = [...new Map(rows.map((row) => [row.article, row])).values()]
    .sort((a, b) => a.article.localeCompare(b.article));
  fs.writeFileSync(outputFile, `${JSON.stringify(unique, null, 2)}\n`, "utf8");
  console.log(`Записано ${unique.length} позиций EAE: ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
