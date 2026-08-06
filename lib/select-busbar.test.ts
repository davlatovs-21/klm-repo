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

test("на длинной трассе потеря напряжения помечена как непосчитанная", () => {
  const long = run({ duty: "main", powerKW: 800, routeLenM: 120, taps: [] });
  assert.ok(long.checks.some((c) => c.level === "info" && c.text.includes("потерю напряжения")));
  const short = run({ duty: "main", powerKW: 800, routeLenM: 20, taps: [] });
  assert.ok(!short.checks.some((c) => c.text.includes("потерю напряжения")));
});

test("номиналы ШМА до 2000 А — только медь", () => {
  const r = run({ duty: "main", mode: "current", currentA: 1500, demand: 1, material: "Al", taps: [] });
  assert.equal(r.ratedA, 1600);
  assert.equal(r.material, "Cu");
  assert.ok(r.checks.some((c) => c.level === "warn" && c.text.includes("только в меди")));
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

test("магистраль без окон отбора не принимает отводы", () => {
  const r = run({ duty: "main", taps: [63] });
  assert.ok(err(r).some((c) => c.text.includes("не имеет окон отбора")));
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
