import assert from "node:assert/strict";
import test from "node:test";
import { convertRow, detectManufacturer, rowsFromMatrix } from "./tray-converter";

test("распознаёт заголовки и строки спецификации", () => {
  const rows = rowsFromMatrix([["Поз.", "Наименование", "Артикул", "Кол-во", "Ед."], [1, "Лоток 100x50x3000", "DKC", 12, "шт"]]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quantity, 12);
});

test("подбирает лоток KLM по типу и габаритам", () => {
  const row = convertRow({ position: "1", name: "Лоток перфорированный 200x80x3000", article: "", quantity: 10, unit: "шт" });
  assert.equal(row.kind, "tray");
  assert.equal(row.trayDesign, "perforated");
  assert.equal(row.klmArticle, "KLM-LP-200x80x3000");
  assert.equal(row.status, "review");
  assert.deepEqual(row.missingCharacteristics, ["толщина", "покрытие"]);
});

test("пересчитывает метры в трёхметровые секции", () => {
  const row = convertRow({ position: "1", name: "Лоток 100x50", article: "", quantity: 10, unit: "м" });
  assert.equal(row.klmQuantity, 4);
});

test("определяет производителя по бренду и характерному артикулу", () => {
  assert.equal(detectManufacturer("Лоток S5 Combitech", "35304"), "DKC");
  assert.equal(detectManufacturer("Лоток металлический", "CLP10-050-100-100-3"), "IEK");
  assert.equal(detectManufacturer("Лоток EKF", "L355001-0,55"), "EKF");
});

test("находит описание по одному артикулу из каталожного индекса", () => {
  const row = convertRow({ position: "1", name: "Позиция по каталогу", article: "L355001-0,55", quantity: 3, unit: "шт" });
  assert.equal(row.manufacturer, "EKF");
  assert.equal(row.width, 50);
  assert.equal(row.height, 35);
  assert.equal(row.thickness, 0.55);
  assert.equal(row.confidence, 99);
});

test("распознаёт производителя и модель EAE", () => {
  assert.equal(detectManufacturer("050 UKD 400 E-Line", "3048059"), "EAE");
  const row = convertRow({ position: "1", name: "EAE", article: "3048071", quantity: 5, unit: "шт" });
  assert.equal(row.manufacturer, "EAE");
  assert.equal(row.width, 200);
  assert.equal(row.height, 100);
  assert.equal(row.confidence, 99);
});

test("определяет производителя по кириллическому написанию бренда", () => {
  assert.equal(detectManufacturer("Лоток ДКС 100x50", ""), "DKC");
  assert.equal(detectManufacturer("Лоток ИЭК", ""), "IEK");
  assert.equal(detectManufacturer("Лоток ОСТЕК", ""), "OSTEC");
});

test("читает толщину стали из наименования", () => {
  const row = convertRow({ position: "1", name: "Лоток перфорированный 100x50x3000, толщина 1,2 мм, оцинкованный", article: "", quantity: 1, unit: "шт" });
  assert.equal(row.thickness, 1.2);
  assert.equal(row.coating, "сталь Сендзимир");
  assert.equal(row.status, "matched");
});
