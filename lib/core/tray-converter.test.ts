import assert from "node:assert/strict";
import test from "node:test";
import { convertRow, rowsFromMatrix } from "./tray-converter";

test("распознаёт заголовки и строки спецификации", () => {
  const rows = rowsFromMatrix([["Поз.", "Наименование", "Артикул", "Кол-во", "Ед."], [1, "Лоток 100x50x3000", "DKC", 12, "шт"]]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quantity, 12);
});

test("подбирает лоток KLM по типу и габаритам", () => {
  const row = convertRow({ position: "1", name: "Лоток перфорированный 200x80x3000", article: "", quantity: 10, unit: "шт" });
  assert.equal(row.klmArticle, "KLM-L-200x80x3000");
  assert.equal(row.status, "matched");
});

test("пересчитывает метры в трёхметровые секции", () => {
  const row = convertRow({ position: "1", name: "Лоток 100x50", article: "", quantity: 10, unit: "м" });
  assert.equal(row.klmQuantity, 4);
});

