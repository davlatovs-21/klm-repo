import assert from "node:assert/strict";
import test from "node:test";
import { convertRows, rowsFromMatrix } from "./busbar-spec-converter";

test("распознаёт Canalis и формирует аналог прямой секции KLM", () => {
  const rows = rowsFromMatrix([
    ["Поз.", "Наименование", "Артикул", "Кол-во", "Ед."],
    [1, "Schneider Canalis KTA прямая секция 1600A Al IP55 4P", "KTA1600ED4", 3, "шт"],
  ]);
  const [result] = convertRows(rows);
  assert.equal(result.manufacturer, "Schneider Electric");
  assert.equal(result.series?.toLowerCase(), "canalis kta");
  assert.deepEqual(result.characteristics, ["1600 А", "Al", "IP55", "4P"]);
  assert.equal(result.klmArticle, "KLM-S-S-1600-Al-IP55-4P");
  assert.equal(result.status, "matched");
});

test("не выдаёт уверенное совпадение при нехватке электрических параметров", () => {
  const [result] = convertRows([{ position: "1", name: "EAE E-Line KO-II коробка отбора", article: "", quantity: 1, unit: "шт" }]);
  assert.equal(result.manufacturer, "EAE");
  assert.equal(result.status, "review");
  assert.ok(result.missingCharacteristics.includes("номинальный ток"));
});

test("распознаёт артикул PitON Electric E3", () => {
  const [result] = convertRows([{ position: "1", name: "Секция прямая", article: "E3-55-Al-4-1600-pt3.0", quantity: 2, unit: "шт" }]);
  assert.equal(result.manufacturer, "PitON Electric");
  assert.equal(result.series, "E3");
  assert.deepEqual(result.characteristics, ["1600 А", "Al", "IP55", "4P"]);
  assert.equal(result.status, "matched");
});
