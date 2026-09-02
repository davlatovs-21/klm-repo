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
  assert.equal(result.klmArticle, "SHMA-1600A");
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

test("преобразует 3P+N+PE в допустимое исполнение KLM 5P", () => {
  const [result] = convertRows([{ position: "3.7", name: "Секция прямая Al, 3P+N+Pe, 4000A, IP55", article: "", quantity: 1, unit: "шт" }]);
  assert.deepEqual(result.characteristics, ["4000 А", "Al", "IP55", "5P"]);
  assert.equal(result.klmName, "Секция прямая 4000 А Al IP55 5P");
  assert.equal(result.klmArticle, "SHMA-4000A");
  assert.equal(result.status, "matched");
});

test("никогда не выдаёт несуществующее исполнение KLM 3P", () => {
  const [result] = convertRows([{ position: "1", name: "Секция прямая 800A Al IP55 3P", article: "", quantity: 1, unit: "шт" }]);
  assert.ok(result.characteristics.includes("4P"));
  assert.doesNotMatch(result.klmName, /3P/);
  assert.doesNotMatch(result.klmArticle, /3P/);
});

test("различает SHMA без точек отбора и SHRA с точками отбора", () => {
  const rows = convertRows([
    { position: "1", name: "Секция прямая без точек отбора 800A Al IP55 4P", article: "", quantity: 1, unit: "шт" },
    { position: "2", name: "Секция прямая с точками отбора 800A Al IP55 4P", article: "", quantity: 1, unit: "шт" },
  ]);
  assert.equal(rows[0].klmArticle, "SHMA-800A");
  assert.equal(rows[1].klmArticle, "SHRA-800A");
});

test("не выдумывает заводской артикул для присоединительной секции", () => {
  const [result] = convertRows([{ position: "3.8", name: "Секция подключения к трансформатору Al, 3P+N+Pe, 4000A, IP55", article: "", quantity: 1, unit: "шт" }]);
  assert.equal(result.klmName, "Секция присоединительная 4000 А Al IP55 5P");
  assert.equal(result.klmArticle, "Требуется заводской артикул");
  assert.equal(result.status, "review");
});
