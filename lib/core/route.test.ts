import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeRoute, turnBetween, splitIntoSections, DEFAULT_LAYOUT,
  planNodes, planBounds, pointAtDistance, distanceAtPoint, snapToGrid, segmentsToPoint,
  type Route, type Segment, type ElementClass,
} from "./route";

let n = 0;
const seg = (direction: Segment["direction"], lengthMm: number, ratedA?: number): Segment => ({
  id: `s${++n}`, direction, lengthMm, ratedA,
});

const route = (over: Partial<Route> = {}): Route => ({
  segments: [seg("x+", 30_000)],
  taps: [],
  crossings: [],
  feed: "start",
  material: "Al",
  branches: 0,
  ...over,
});

const count = (r: ReturnType<typeof analyzeRoute>, cls: ElementClass) =>
  r.elements.filter((e) => e.class === cls).reduce((a, e) => a + e.count, 0);

const detailOf = (r: ReturnType<typeof analyzeRoute>, cls: ElementClass) =>
  r.elements.filter((e) => e.class === cls).map((e) => e.detail);

const errors = (r: ReturnType<typeof analyzeRoute>) => r.checks.filter((c) => c.level === "error");

/* ── повороты ───────────────────────────────────────────────────── */

test("поворот определяется по паре направлений, сторона — по знаку векторного произведения", () => {
  assert.deepEqual(turnBetween("x+", "y+"), { kind: "horizontal", side: "левый" });
  assert.deepEqual(turnBetween("x+", "y-"), { kind: "horizontal", side: "правый" });
  assert.deepEqual(turnBetween("y+", "x-"), { kind: "horizontal", side: "левый" });
  assert.deepEqual(turnBetween("y+", "x+"), { kind: "horizontal", side: "правый" });
});

test("подъём и спуск дают вертикальный угол", () => {
  assert.deepEqual(turnBetween("x+", "up"), { kind: "vertical", side: "вверх" });
  assert.deepEqual(turnBetween("up", "x+"), { kind: "vertical", side: "вниз" });
  assert.deepEqual(turnBetween("x+", "down"), { kind: "vertical", side: "вниз" });
});

test("прямой участок угла не требует, разворот на 180° углом не закрывается", () => {
  assert.equal(turnBetween("x+", "x+"), null);
  assert.deepEqual(turnBetween("x+", "x-"), { kind: "reversal" });
  assert.deepEqual(turnBetween("y-", "y+"), { kind: "reversal" });
});

test("разворот в трассе — ошибка ввода, а не элемент", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 10_000), seg("x-", 10_000)] }));
  assert.ok(errors(r).some((c) => c.text.includes("навстречу")));
  assert.equal(count(r, "Угол горизонтальный"), 0);
});

/* ── разбиение на секции ────────────────────────────────────────── */

test("длина режется жадно от максимальной секции", () => {
  assert.deepEqual(splitIntoSections(9000, 1000, 3000), { full: 3, remainderMm: 0, nonStandard: false });
  assert.deepEqual(splitIntoSections(10_000, 1000, 3000), { full: 3, remainderMm: 1000, nonStandard: false });
  assert.deepEqual(splitIntoSections(9500, 1000, 3000), { full: 3, remainderMm: 500, nonStandard: true });
});

test("остаток короче минимальной длины помечается как секция под заказ", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 9_500)] }));
  assert.equal(count(r, "Прямая секция нестандартной длины"), 1);
  assert.deepEqual(detailOf(r, "Прямая секция нестандартной длины"), ["500 мм"]);
  assert.ok(r.checks.some((c) => c.level === "warn" && c.text.includes("нестандартной длины")));
});

test("кратная длина не порождает нестандартных секций", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 30_000)] }));
  assert.equal(count(r, "Прямая секция"), 10);
  assert.equal(count(r, "Прямая секция нестандартной длины"), 0);
});

/* ── длины и элементы ───────────────────────────────────────────── */

test("длины считаются раздельно по горизонтали и вертикали", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 30_000), seg("up", 6_000), seg("y+", 12_000)] }));
  assert.equal(r.totalLengthM, 48);
  assert.equal(r.horizontalLengthM, 42);
  assert.equal(r.verticalLengthM, 6);
});

test("вводная секция одна при питании с конца и две при питании с двух сторон", () => {
  assert.equal(count(analyzeRoute(route({ feed: "start" })), "Вводная секция"), 1);
  assert.equal(count(analyzeRoute(route({ feed: "both" })), "Вводная секция"), 2);
});

test("заглушка ставится на свободный конец, а занятый вводом не закрывается", () => {
  assert.equal(count(analyzeRoute(route({ feed: "start" })), "Торцевая заглушка"), 1);
  assert.equal(count(analyzeRoute(route({ feed: "both" })), "Торцевая заглушка"), 0);
  assert.equal(count(analyzeRoute(route({ feed: "center" })), "Торцевая заглушка"), 2);
});

test("тройник добавляет заглушку на конце ответвления", () => {
  const r = analyzeRoute(route({ branches: 2 }));
  assert.equal(count(r, "Тройник"), 2);
  assert.equal(count(r, "Торцевая заглушка"), 3); // один свободный конец плюс два ответвления
});

test("смена номинала по длине даёт редукцию с расшифровкой", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 9_000, 1600), seg("x+", 9_000, 1000)] }));
  assert.equal(count(r, "Редукция"), 1);
  assert.deepEqual(detailOf(r, "Редукция"), ["1600 → 1000 А"]);
});

/* ── отводы ─────────────────────────────────────────────────────── */

test("каждый отвод получает коробку своего номинала", () => {
  const r = analyzeRoute(
    route({ taps: [{ id: "t1", positionM: 5, currentA: 63 }, { id: "t2", positionM: 12, currentA: 100 }] }),
  );
  assert.equal(count(r, "Коробка отбора (КОМ)"), 2);
  assert.deepEqual(detailOf(r, "Коробка отбора (КОМ)").sort(), ["125 А", "63 А"]);
});

test("отвод выше окна отбора требует секции отбора", () => {
  const r = analyzeRoute(route({ taps: [{ id: "t1", positionM: 10, currentA: 400 }] }));
  assert.equal(count(r, "Секция отбора"), 1);
  assert.equal(count(r, "Коробка отбора (КОМ)"), 1);
});

test("отвод за пределами трассы — ошибка, а не молчаливое усечение", () => {
  const r = analyzeRoute(route({ taps: [{ id: "t1", positionM: 100, currentA: 63, purpose: "станок" }] }));
  assert.ok(errors(r).some((c) => c.text.includes("вне трассы")));
  assert.equal(count(r, "Коробка отбора (КОМ)"), 0);
});

test("отвод выше ряда КОМ отбраковывается", () => {
  const r = analyzeRoute(route({ taps: [{ id: "t1", positionM: 10, currentA: 900 }] }));
  assert.ok(errors(r).some((c) => c.text.includes("выше ряда КОМ")));
});

/* ── пересечения и компенсаторы ─────────────────────────────────── */

test("пересечения границ дают проходки своего типа", () => {
  const r = analyzeRoute(
    route({
      crossings: [
        { id: "c1", positionM: 10, kind: "fire" },
        { id: "c2", positionM: 20, kind: "wall" },
        { id: "c3", positionM: 25, kind: "expansion" },
      ],
    }),
  );
  assert.equal(count(r, "Противопожарная проходка"), 1);
  assert.equal(count(r, "Проходка через стену или перекрытие"), 1);
  assert.equal(count(r, "Дилатационная вставка"), 1);
});

test("компенсаторы считаются по тепловому расширению трассы", () => {
  // Al, 120 м, ΔT 40 °C → 110,4 мм при допуске 15 мм
  const r = analyzeRoute(route({ segments: [seg("x+", 120_000)], material: "Al" }));
  assert.equal(count(r, "Компенсатор"), 7);
  const cu = analyzeRoute(route({ segments: [seg("x+", 120_000)], material: "Cu" }));
  assert.ok(count(cu, "Компенсатор") < 7, "медь расширяется меньше");
});

/* ── подвесы и стыки ────────────────────────────────────────────── */

test("подвесы считаются своим шагом по горизонтали и вертикали", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 30_000), seg("up", 6_000)] }));
  // горизонталь 30 м шагом 2,5 → 13, плюс 1 угол; вертикаль 6 м шагом 3 → 3
  assert.equal(count(r, "Подвес / кронштейн"), 13 + 1 + 3);
});

test("комплекты соединения считаются по числу стыков", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 9_000), seg("y+", 9_000)] }));
  // 3 + 3 секции, 1 угол → 7 элементов подряд → 6 стыков
  assert.equal(count(r, "Комплект соединительный"), 6);
});

/* ── честность результата ───────────────────────────────────────── */

test("вычет длины углов не делается молча — выводится предупреждение", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 9_000), seg("y+", 9_000)] }));
  const w = r.checks.find((c) => c.text.includes("Углы занимают часть длины"));
  assert.ok(w, "предупреждение обязательно");
  assert.match(w!.fix ?? "", /04-geometriya-raskladki/);
});

test("отсутствие артикулов и цен заявлено прямо", () => {
  const r = analyzeRoute(route());
  assert.ok(r.checks.some((c) => c.text.includes("без артикулов")));
});

test("пустая трасса — ошибка, а не спецификация из воздуха", () => {
  const r = analyzeRoute(route({ segments: [] }));
  assert.equal(r.totalItems, 0);
  assert.ok(errors(r).some((c) => c.text.includes("пустая")));
});

test("нулевая длина участка отбраковывается", () => {
  const r = analyzeRoute(route({ segments: [seg("x+", 0)] }));
  assert.ok(errors(r).some((c) => c.text.includes("нулевой")));
});

/* ── связная трасса из ТЗ 8.4 ──────────────────────────────────── */

test("трасса из восьми участков с изломами, тройником и отводами разбирается целиком", () => {
  const r = analyzeRoute(
    route({
      segments: [
        seg("x+", 30_000), seg("y+", 12_000), seg("x+", 24_000), seg("up", 6_000),
        seg("x+", 18_000), seg("y-", 9_000), seg("x+", 15_000), seg("down", 6_000),
      ],
      branches: 1,
      feed: "start",
      taps: Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, positionM: 5 + i * 8, currentA: 63 })),
      crossings: [
        { id: "c1", positionM: 40, kind: "fire" },
        { id: "c2", positionM: 70, kind: "expansion" },
      ],
    }),
  );

  assert.equal(r.totalLengthM, 120);
  assert.equal(errors(r).length, 0, "ошибок быть не должно");
  assert.equal(count(r, "Угол горизонтальный") + count(r, "Угол вертикальный"), 7);
  assert.equal(count(r, "Коробка отбора (КОМ)"), 12);
  assert.equal(count(r, "Тройник"), 1);
  assert.equal(count(r, "Противопожарная проходка"), 1);
  assert.ok(r.totalItems > 60, "позиций набирается на полноценную спецификацию");
  assert.ok(r.trace.length >= 4, "трассировка расчёта заполнена");
});

test("параметры раскладки влияют на итог — они данные, а не константы", () => {
  const base = route({ segments: [seg("x+", 24_000)] });
  const standard = analyzeRoute(base, DEFAULT_LAYOUT);
  const longer = analyzeRoute(base, { ...DEFAULT_LAYOUT, sectionMaxMm: 4000 });
  assert.equal(count(standard, "Прямая секция"), 8);
  assert.equal(count(longer, "Прямая секция"), 6);
});

/* ── план для схемы ─────────────────────────────────────────────── */

test("ломаная плана строится по направлениям, узлов на один больше участков", () => {
  const nodes = planNodes([seg("x+", 30_000), seg("y+", 12_000)]);
  assert.equal(nodes.length, 3);
  assert.deepEqual(nodes.map((n) => [n.xMm, n.yMm]), [[0, 0], [30_000, 0], [30_000, 12_000]]);
  assert.deepEqual(nodes.map((n) => n.atMm), [0, 30_000, 42_000]);
});

test("вертикальный участок не смещает план, но занимает расстояние вдоль трассы", () => {
  const nodes = planNodes([seg("x+", 10_000), seg("up", 6_000), seg("x+", 10_000)]);
  assert.deepEqual(nodes.map((n) => [n.xMm, n.yMm]), [[0, 0], [10_000, 0], [10_000, 0], [20_000, 0]]);
  assert.deepEqual(nodes.map((n) => n.atMm), [0, 10_000, 16_000, 26_000]);
  assert.equal(nodes[2].verticalMm, 6_000, "подъём записан со знаком");
  assert.equal(planNodes([seg("down", 4_000)])[1].verticalMm, -4_000, "спуск отрицательный");
});

test("габариты плана охватывают все узлы, включая ход в минус", () => {
  const b = planBounds(planNodes([seg("x-", 10_000), seg("y-", 5_000)]));
  assert.deepEqual(b, { minX: -10_000, maxX: 0, minY: -5_000, maxY: 0 });
});

test("точка на заданном расстоянии интерполируется вдоль участка", () => {
  const s = [seg("x+", 30_000), seg("y+", 12_000)];
  assert.deepEqual(pointAtDistance(s, 0), { xMm: 0, yMm: 0 });
  assert.deepEqual(pointAtDistance(s, 15_000), { xMm: 15_000, yMm: 0 });
  assert.deepEqual(pointAtDistance(s, 30_000), { xMm: 30_000, yMm: 0 });
  assert.deepEqual(pointAtDistance(s, 36_000), { xMm: 30_000, yMm: 6_000 });
});

test("расстояние за пределами трассы зажимается концами", () => {
  const s = [seg("x+", 10_000)];
  assert.deepEqual(pointAtDistance(s, -5_000), { xMm: 0, yMm: 0 });
  assert.deepEqual(pointAtDistance(s, 99_000), { xMm: 10_000, yMm: 0 });
});

test("внутри вертикального участка план стоит на месте", () => {
  const s = [seg("x+", 10_000), seg("up", 6_000), seg("x+", 10_000)];
  assert.deepEqual(pointAtDistance(s, 13_000), { xMm: 10_000, yMm: 0 });
  assert.deepEqual(pointAtDistance(s, 21_000), { xMm: 15_000, yMm: 0 });
});

test("обратная задача: точка плана переводится в расстояние вдоль трассы", () => {
  const s = [seg("x+", 30_000), seg("y+", 12_000)];
  assert.equal(distanceAtPoint(s, 15_000, 0), 15_000);
  assert.equal(distanceAtPoint(s, 15_000, 2_000), 15_000, "промах в сторону проецируется на трассу");
  assert.equal(distanceAtPoint(s, 30_000, 6_000), 36_000, "второй участок");
});

test("перетаскивание за пределы участка прижимается к его концу", () => {
  const s = [seg("x+", 30_000)];
  assert.equal(distanceAtPoint(s, -9_000, 0), 0);
  assert.equal(distanceAtPoint(s, 99_000, 0), 30_000);
});

test("вертикальные участки в обратной задаче пропускаются — в плане они точка", () => {
  const s = [seg("up", 6_000), seg("x+", 10_000)];
  assert.equal(distanceAtPoint(s, 5_000, 0), 11_000, "расстояние отсчитано с учётом вертикали");
});

test("прямой и обратный переводы согласованы между собой", () => {
  const s = [seg("x+", 30_000), seg("y+", 12_000), seg("x-", 9_000)];
  for (const d of [0, 7_500, 30_000, 36_000, 45_000, 51_000]) {
    const p = pointAtDistance(s, d);
    assert.ok(Math.abs(distanceAtPoint(s, p.xMm, p.yMm) - d) < 1, `расстояние ${d} мм`);
  }
});

test("привязка к сетке округляет позицию к шагу окон отбора 0,5 м", () => {
  assert.equal(snapToGrid(12.3), 12.5);
  assert.equal(snapToGrid(12.2), 12);
  assert.equal(snapToGrid(0.24), 0);
  assert.equal(snapToGrid(7.75), 8);
  assert.equal(snapToGrid(12.34, 1), 12);
});

test("клик по плану раскладывается в ортогональные участки, длинная сторона первой", () => {
  assert.deepEqual(segmentsToPoint(0, 0, 10_000, 3_000), [
    { direction: "x+", lengthMm: 10_000 },
    { direction: "y+", lengthMm: 3_000 },
  ]);
  assert.deepEqual(segmentsToPoint(0, 0, 3_000, 10_000), [
    { direction: "y+", lengthMm: 10_000 },
    { direction: "x+", lengthMm: 3_000 },
  ]);
  assert.deepEqual(segmentsToPoint(0, 0, -8_000, -2_000), [
    { direction: "x-", lengthMm: 8_000 },
    { direction: "y-", lengthMm: 2_000 },
  ]);
});

test("клик по одной оси даёт один участок, а рядом с концом — ни одного", () => {
  assert.deepEqual(segmentsToPoint(0, 0, 10_000, 0), [{ direction: "x+", lengthMm: 10_000 }]);
  assert.deepEqual(segmentsToPoint(0, 0, 200, 100), [], "мусорные отрезки короче шага сетки отбрасываются");
});

test("нарисованная кликами трасса совпадает с введённой списком", () => {
  const drawn = segmentsToPoint(0, 0, 30_000, 12_000).map((s, i) => ({ id: `d${i}`, ...s }));
  const typed = [seg("x+", 30_000), seg("y+", 12_000)];
  assert.deepEqual(
    planNodes(drawn).map((n) => [n.xMm, n.yMm]),
    planNodes(typed).map((n) => [n.xMm, n.yMm]),
  );
});
