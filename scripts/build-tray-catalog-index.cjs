/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node.js maintenance script */
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");
const ekfFile = path.join(root, "Лоток", "catalogs", "EKF", "EKF-pricelist-2026-08-30.xlsx");
const output = path.join(root, "lib", "core", "tray-catalog-index.json");
const makintehFile = path.join(root, "Лоток", "catalogs", "Makinteh", "Makinteh-EAE-products.json");

const workbook = XLSX.readFile(ekfFile);
const matrix = XLSX.utils.sheet_to_json(workbook.Sheets["Продукция EKF"], { header: 1, defval: "" });
const headerIndex = matrix.findIndex((row) => row[0] === "Артикул" && row[1] === "Номенклатура");
if (headerIndex < 0) throw new Error("EKF: строка заголовков не найдена");

const ekf = matrix.slice(headerIndex + 1)
  .filter((row) => String(row[16]).startsWith("31 Лотки металлические"))
  .map((row) => ({
    manufacturer: "EKF",
    article: String(row[0]).trim(),
    name: String(row[1]).trim(),
    family: String(row[17]).replace(/^\d+(?:\.\d+)*\s*/, "").trim(),
  }))
  .filter((row) => row.article && row.name);

// Артикулы из официальных типовых спецификаций DKC и таблиц каталога IEK.
const officialExamples = [
  { manufacturer: "DKC", article: "35302", name: "Лоток перфорированный 100x80 L3000 S5 Combitech", family: "S5 Combitech" },
  { manufacturer: "DKC", article: "35304", name: "Лоток перфорированный 200x80 L3000 S5 Combitech", family: "S5 Combitech" },
  { manufacturer: "DKC", article: "35522", name: "Крышка с заземлением на лоток 100 L3000", family: "S5 Combitech" },
  { manufacturer: "DKC", article: "35524", name: "Крышка с заземлением на лоток 200 L3000", family: "S5 Combitech" },
  { manufacturer: "DKC", article: "36024", name: "Угол CPO 90 горизонтальный 200x80", family: "S5 Combitech" },
  { manufacturer: "DKC", article: "37164", name: "Ответвитель TDS Т-образный 200x80", family: "S5 Combitech" },
  { manufacturer: "IEK", article: "CLP10-050-050-100-3", name: "Лоток перфорированный 50x50x3000-1,0", family: "ESCA" },
  { manufacturer: "IEK", article: "CLP10-050-100-100-3", name: "Лоток перфорированный 50x100x3000-1,0", family: "ESCA" }
];

const eae = fs.existsSync(makintehFile) ? JSON.parse(fs.readFileSync(makintehFile, "utf8")) : [];
const rows = [...ekf, ...officialExamples, ...eae].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.article.localeCompare(b.article));
fs.writeFileSync(output, `${JSON.stringify(rows)}\n`, "utf8");
console.log(`Записано ${rows.length} позиций: ${output}`);
