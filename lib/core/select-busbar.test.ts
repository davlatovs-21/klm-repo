import { test } from "node:test";
import assert from "node:assert/strict";
import { selectBusbar, derating, DEFAULT_INPUT, PRESETS, type Input } from "./select-busbar";

const run = (p: Partial<Input>) => selectBusbar({ ...DEFAULT_INPUT, ...p });
const err = (r: ReturnType<typeof selectBusbar>) => r.checks.filter((c) => c.level === "error");

test("расчёт тока по мощности и подбор минимального достаточного номинала", () => {
  // 800 кВт · Kс 0,8 · 400 В · cosφ 0,9 → 1026 А → ближайший номинал ШМА 1250 А
  const r = run({ duty: "main", powerKW: 800, taps: [] });
  assert.equal(r.loadA, 1026);
  assert.equal(r.ratedA, 1250);
  assert.equal(r.series.name, "KLM-S");
  assert.equal(err(r).length, 0);
});

test("поправка на температуру отсчитывается от 35 °C по таблице, а не от 40 °C линейно", () => {
  assert.equal(derating(25), 1); // повышающий коэффициент не применяется
  assert.equal(derating(35), 1);
  assert.equal(derating(40), 0.97);
  assert.equal(derating(45), 0.94);
  assert.equal(derating(50), 0.9);
  assert.equal(derating(55), 0.86);
  assert.equal(derating(42), 0.9580); // между точками — линейно
  assert.ok(derating(70) < 0.86 && derating(70) >= 0.6); // за таблицей — экстраполяция с полом
  const cold = run({ mode: "current", currentA: 1150, ambientC: 35, taps: [] });
  const hot = run({ mode: "current", currentA: 1150, ambientC: 50, taps: [] });
  assert.equal(cold.ratedA, 1250);
  assert.equal(hot.ratedA, 1600);
  assert.ok(run({ ambientC: 70, taps: [] }).checks.some((c) => c.text.includes("Таблица поправок")));
});

test("поправка складывается из четырёх факторов раздела 7.2, а не только из температуры", () => {
  const r = run({
    duty: "main", mode: "current", currentA: 1000,
    ambientC: 45, mountWay: "flat", parallelRuns: 2, altitudeM: 2500, taps: [],
  });
  assert.deepEqual(r.deratingParts, { kt: 0.94, km: 0.9, kg: 0.95, kh: 0.95 });
  assert.equal(r.derating, 0.7635); // 0,94 · 0,9 · 0,95 · 0,95
  assert.equal(r.requiredA, 1310); // 1000 / 0,7634
  assert.equal(r.ratedA, 1600); // без поправок хватило бы 1000 А
});

test("нормальные условия не снижают ток", () => {
  const r = run({ duty: "main", mode: "current", currentA: 1000, taps: [] });
  assert.equal(r.derating, 1);
  assert.deepEqual(r.deratingParts, { kt: 1, km: 1, kg: 1, kh: 1 });
  assert.equal(r.ratedA, 1000);
});

test("высота учитывается только выше 2000 м", () => {
  const at = (altitudeM: number) => run({ duty: "main", mode: "current", currentA: 1000, altitudeM, taps: [] }).deratingParts.kh;
  assert.equal(at(0), 1);
  assert.equal(at(2000), 1);
  assert.equal(at(2001), 0.95);
});

test("введённый расчётный ток не умножается на Kс второй раз", () => {
  const r = run({ mode: "current", currentA: 1000, demand: 0.5, ambientC: 35, taps: [] });
  assert.equal(r.loadA, 1000);
  assert.equal(r.ratedA, 1000);
  // по мощности Kс работает: 800 кВт · 0,8 → 1026 А, при Kс 1,0 → 1283 А
  assert.equal(run({ mode: "power", powerKW: 800, demand: 1, taps: [] }).loadA, 1283);
});

test("тесный запас по току — предупреждение, а не молчание", () => {
  const tight = run({ duty: "main", mode: "current", currentA: 1240, taps: [] });
  assert.equal(tight.ratedA, 1250);
  assert.ok(tight.reservePct < 15);
  assert.ok(tight.checks.some((c) => c.level === "warn" && c.text.includes("Запас по току")));
  const roomy = run({ duty: "main", mode: "current", currentA: 640, taps: [] }); // 640 → 800 А, запас 25 %
  assert.ok(!roomy.checks.some((c) => c.text.includes("Запас по току")));
});

/**
 * С появлением каталога V3 (стр. 6) у номиналов есть R и X, и ΔU считается
 * по-настоящему. Раньше на длинной трассе выводилась отметка «проверить отдельно».
 */
test("потеря напряжения считается по сопротивлениям каталога", () => {
  const r = run({ duty: "main", powerKW: 800, routeLenM: 120, material: "Al", taps: [] });
  assert.ok(r.profile, "профиль номинала берётся из каталога");
  assert.ok(r.drop, "ΔU посчитано, а не помечено как непосчитанное");
  assert.ok(r.drop!.deltaU_pct > 0);
  assert.equal(r.drop!.limitPct, 5); // ПУЭ 1.2.21
  assert.ok(!r.checks.some((c) => c.text.includes("проверить отдельно")));
});

test("длинная трасса на алюминии выходит за 5 % — это ошибка, а не примечание", () => {
  const r = run({ duty: "main", mode: "current", currentA: 1500, demand: 1, routeLenM: 300, material: "Al", taps: [] });
  assert.ok(r.drop && !r.drop.verdict.ok);
  assert.ok(err(r).some((c) => c.text.includes("ΔU")));
});

test("медь того же номинала даёт меньшее падение, чем алюминий", () => {
  const base = { duty: "main" as const, mode: "current" as const, currentA: 1500, demand: 1, routeLenM: 150, taps: [] };
  const al = run({ ...base, material: "Al" });
  const cu = run({ ...base, material: "Cu" });
  assert.equal(al.ratedA, cu.ratedA);
  assert.ok(cu.drop!.deltaU_pct < al.drop!.deltaU_pct);
});

test("масса трассы берётся из каталога, а не из ориентира", () => {
  const r = run({ duty: "main", mode: "current", currentA: 1500, demand: 1, routeLenM: 100, material: "Al", taps: [] });
  assert.equal(r.ratedA, 1600);
  assert.equal(r.massKg, 1940); // 19,4 кг/м × 100 м, каталог V3 стр. 7, 4P IP55
});

/**
 * На сайте значилось, что 160–2000 А выпускаются только в меди.
 * Каталог V3 (стр. 6–7) даёт оба материала на всём ряду 160–6300 А.
 */
test("алюминий доступен на всём ряду — подмены материала на медь нет", () => {
  const r = run({ duty: "main", mode: "current", currentA: 1500, demand: 1, material: "Al", taps: [] });
  assert.equal(r.ratedA, 1600);
  assert.equal(r.material, "Al");
  assert.ok(!r.checks.some((c) => c.text.includes("только в меди")));
});

test("в ряду KLM-S есть 315 и 500 А и нет 10 000 А", () => {
  const currents = run({ duty: "main", taps: [] }).series.currents;
  assert.ok(currents.includes(315) && currents.includes(500));
  assert.equal(currents[currents.length - 1], 6300);
});

test("ток выше ряда серии — ошибка, а не молчаливое усечение", () => {
  const r = run({ duty: "distribution", mode: "current", currentA: 2500, demand: 1, taps: [] });
  assert.equal(r.ratedA, null);
  assert.ok(err(r).some((c) => c.text.includes("выше ряда серии")));
});

test("отводы: КОМ подбирается, выше 250 А идёт через секцию отбора", () => {
  const r = run({ duty: "distribution", mode: "current", currentA: 800, demand: 1, routeLenM: 60, taps: [63, 400] });
  assert.deepEqual(
    r.tapBoxes.map((t) => [t.requestedA, t.boxA, t.viaSection]),
    [
      [63, 63, false],
      [400, 400, true],
    ],
  );
  assert.ok(r.checks.some((c) => c.level === "warn" && c.text.includes("больше 250 А на окно")));
});

test("сумма отводов не может превысить номинал магистрали", () => {
  const r = run({ duty: "distribution", mode: "current", currentA: 400, demand: 1, routeLenM: 60, taps: [250, 250, 250] });
  assert.ok(err(r).some((c) => c.text.includes("Сумма отводов")));
});

test("отводов больше, чем окон на длине трассы — ошибка", () => {
  const r = run({ duty: "distribution", mode: "current", currentA: 630, demand: 1, routeLenM: 1, taps: [16, 16, 32] });
  assert.ok(err(r).some((c) => c.text.includes("не помещается")));
});

test("если отводы влезают только при плотном шаге окон — это требование, а не ошибка", () => {
  const r = run({ duty: "distribution", mode: "current", currentA: 630, demand: 1, routeLenM: 3, taps: [16, 16, 32, 32] });
  assert.equal(err(r).length, 0);
  assert.ok(r.checks.some((c) => c.level === "info" && c.text.includes("требуют шага окон 0.5 м")));
});

/**
 * Каталог V3, стр. 24: на магистраль ставятся коробки отбора — Plug-in в окно
 * секции Pi и Bolt-on на стык. Прежнее «у магистрали окон отбора нет» снято.
 */
test("магистраль принимает отводы: ряд коробок начинается со 160 А", () => {
  const r = run({ duty: "main", mode: "current", currentA: 1500, demand: 1, routeLenM: 60, taps: [63, 400] });
  assert.ok(!err(r).some((c) => c.text.includes("не имеет окон отбора")));
  assert.deepEqual(
    r.tapBoxes.map((t) => [t.requestedA, t.boxA, t.viaSection]),
    [
      [63, 160, false],
      [400, 400, false],
    ],
  );
});

test("на магистрали окно держит до 630 А, выше — секция отбора", () => {
  const r = run({ duty: "main", mode: "current", currentA: 2400, demand: 1, routeLenM: 60, taps: [800] });
  assert.deepEqual(r.tapBoxes.map((t) => [t.boxA, t.viaSection]), [[800, true]]);
  assert.ok(r.checks.some((c) => c.level === "warn" && c.text.includes("больше 630 А на окно")));
});

test("6 кВ на низковольтной серии — ошибка; на ТПЛ проходит", () => {
  assert.ok(err(run({ duty: "main", voltageV: 6000, taps: [] })).length > 0);
  const mv = run({ duty: "mv", mode: "current", currentA: 4000, demand: 1, voltageV: 10000, taps: [] });
  assert.equal(mv.series.name, "ТПЛ");
  assert.equal(mv.ratedA, 4000);
  assert.equal(err(mv).length, 0);
});

test("IP среды не выше возможностей серии", () => {
  const r = run({ duty: "distribution", mode: "current", currentA: 400, demand: 1, env: "outdoor", taps: [] });
  assert.equal(r.ip, 55); // ШРА даёт максимум IP55
  assert.ok(r.checks.some((c) => c.text.includes("IP68")));
});

test("ссылка на страницу источника ведёт на конкретный номинал", () => {
  assert.equal(run({ duty: "main", powerKW: 800, taps: [] }).productPath, "/catalog/shinoprovod-magistralnyy/shma-1250a");
  assert.match(run({ duty: "main", powerKW: 800, taps: [] }).sourceUrl, /^https:\/\/xn--/);
});

test("пресеты не падают, а сценарий-ошибка действительно ошибка", () => {
  for (const p of PRESETS) assert.ok(selectBusbar(p.input).series);
  const bad = PRESETS.find((p) => p.name.startsWith("Ошибка"))!;
  assert.ok(selectBusbar(bad.input).checks.some((c) => c.level !== "info"));
});
