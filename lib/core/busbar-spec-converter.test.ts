import assert from "node:assert/strict";
import test from "node:test";
import { convertRows, rowsFromMatrix } from "./busbar-spec-converter";
import { TAP_BOXES_FULL } from "./klm-catalog";

test("подбирает коробки по всем номиналам справочника KLM без материала шин", () => {
  for (const box of TAP_BOXES_FULL) {
    const [result] = convertRows(rowsFromMatrix([
      ["Поз.", "Наименование", "Артикул", "Кол-во", "Ед."],
      [7, `EAE коробка отбора ${box.ratedA}A IP55 4P`, "", 12, "шт"],
    ]));
    assert.equal(result.klmArticle, box.sku);
    assert.equal(result.klmQuantity, 12);
    assert.ok(!result.missingCharacteristics.includes("материал шин"));
    assert.ok(!result.missingCharacteristics.includes("номинал отсутствует в ряду KLM-S"));
    assert.equal(result.status, "review"); // Совместимость с трассой не задана в строке.
  }
});

test("распознаёт сокращения и варианты названия коробки", () => {
  for (const name of ["КОМ", "Ответвительная коробка", "Коробка ответвительная", "Коробка отвода", "Tap-off box", "Tapp-off", "Plug-in box"]) {
    const [result] = convertRows([{ position: "1", name: `${name} 63A IP54 4P`, article: "", quantity: 2, unit: "шт" }]);
    assert.equal(result.klmArticle, "TAPP-OFF-63A", name);
  }
});

test("промежуточный ток требует согласования аппарата, а не становится номиналом магистрали", () => {
  const [result] = convertRows([{ position: "1", name: "КОМ 100A IP55 4P", article: "", quantity: 1, unit: "шт" }]);
  assert.equal(result.klmArticle, "TAPP-OFF-125A");
  assert.match(result.klmName, /125 А/);
  assert.ok(result.missingCharacteristics.some((item) => item.includes("аппарат защиты на 100 А")));
});

test("не подменяет пустые, несовместимые и неоднозначные коробки готовым TAPP-OFF", () => {
  for (const name of ["КОМ пустая 250A IP55 4P", "КОМ 250A IP65 4P", "КОМ 250A IP55 3P", "Bolt-on box 250A IP55 4P", "КОМ 250A, автомат 160A IP55 4P", "КОМ 1600A IP55 4P"]) {
    const [result] = convertRows([{ position: "1", name, article: "", quantity: 1, unit: "шт" }]);
    assert.equal(result.klmArticle, "Требуется заводской артикул", name);
    assert.equal(result.status, "review");
  }
});

test("для коробки 800 А показывает каталог KLM-S Bolt-on и необходимость заводского артикула", () => {
  const [result] = convertRows([{ position: "1", name: "Коробка отбора 800A IP55 5P", article: "", quantity: 3, unit: "шт" }]);
  assert.ok(result.characteristics.includes("Каталог KLM-S: Bolt-on 800 А"));
  assert.equal(result.klmArticle, "Требуется заводской артикул");
});

test("распознаёт Canalis и формирует аналог прямой секции KLM", () => {
  const rows = rowsFromMatrix([
    ["Поз.", "Наименование", "Артикул", "Кол-во", "Ед."],
    [1, "Schneider Canalis KTA прямая секция 1600A Al IP55 4P", "KTA1600ED4", 3, "шт"],
  ]);
  const [result] = convertRows(rows);
  assert.equal(result.manufacturer, "Schneider Electric");
  assert.equal(result.series?.toLowerCase(), "canalis kta");
  assert.deepEqual(result.characteristics, ["1600 А", "Al", "IP55", "4P"]);
  assert.equal(result.klmArticle, "KLM-S-16-Al-55-4-3-FE");
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
  assert.equal(result.klmArticle, "KLM-S-40-Al-55-5-3-FE");
  assert.equal(result.status, "matched");
});

test("никогда не выдаёт несуществующее исполнение KLM 3P", () => {
  const [result] = convertRows([{ position: "1", name: "Секция прямая 800A Al IP55 3P", article: "", quantity: 1, unit: "шт" }]);
  assert.ok(result.characteristics.includes("4P"));
  assert.doesNotMatch(result.klmName, /3P/);
  assert.doesNotMatch(result.klmArticle, /3P/);
});

test("различает заводские коды FE и Pi", () => {
  const rows = convertRows([
    { position: "1", name: "Секция прямая без точек отбора 800A Al IP55 4P", article: "", quantity: 1, unit: "шт" },
    { position: "2", name: "Секция прямая с точками отбора 800A Al IP55 4P", article: "", quantity: 1, unit: "шт" },
  ]);
  assert.equal(rows[0].klmArticle, "KLM-S-08-Al-55-4-3-FE");
  assert.equal(rows[1].klmArticle, "KLM-S-08-Al-55-4-3-Pi");
});

test("формирует заводской артикул присоединительной секции ATT", () => {
  const [result] = convertRows([{ position: "3.8", name: "Секция подключения к трансформатору Al, 3P+N+Pe, 4000A, IP55", article: "", quantity: 1, unit: "шт" }]);
  assert.equal(result.klmName, "Секция присоединительная к трансформатору 4000 А Al IP55 5P");
  assert.equal(result.klmArticle, "KLM-S-40-Al-55-5-3-ATT");
  assert.equal(result.status, "matched");
});

test("формирует заводской артикул горизонтального угла 2000 А", () => {
  const [result] = convertRows([{ position: "3.24", name: "Горизонтальный угол стандартный, тип 2, Al, 3P+N+Pe, 2000А, IP55", article: "1.М.2-3-2000А", quantity: 1, unit: "шт" }]);
  assert.equal(result.klmArticle, "KLM-S-20-Al-55-5-3-CD");
  assert.equal(result.status, "matched");
});

test("считает соединительную секцию и крышку соединения стыковочными элементами", () => {
  const rows = convertRows([
    { position: "3.34", name: "Крышка соединения", article: "1.М.2-3-2000А", quantity: 1, unit: "шт" },
    { position: "3.35", name: "Соединительная секция 2000A Al IP55 5P", article: "", quantity: 2, unit: "шт" },
  ]);

  assert.equal(rows[0].klmName, "Стыковочный элемент 2000 А");
  assert.ok(!rows[0].missingCharacteristics.includes("тип элемента"));
  assert.equal(rows[1].klmName, "Стыковочный элемент 2000 А Al IP55 5P");
  assert.equal(rows[1].klmArticle, "KLM-S-20-Al-55-5-3-G");
  assert.equal(rows[1].status, "matched");
});

test("распознаёт варианты элементов из импортированной спецификации", () => {
  const rows = convertRows([
    { position: "3.33", name: "Коробка отвода мощности, пустая, 3P+N+Pe, 250A", article: "", quantity: 1, unit: "шт" },
    { position: "3.36", name: "Секция вертикальная Z-образная, тип 2, Al, 3P+N+Pe, 4000A, IP55", article: "", quantity: 1, unit: "шт" },
  ]);

  assert.equal(rows[0].klmName, "Коробка отбора мощности 250 А 5P");
  assert.ok(!rows[0].missingCharacteristics.includes("тип элемента"));
  assert.equal(rows[1].klmName, "Секция Z-образная вертикальная 4000 А Al IP55 5P");
  assert.equal(rows[1].klmArticle, "KLM-S-40-Al-55-5-3-ZP");
  assert.equal(rows[1].status, "matched");
});
