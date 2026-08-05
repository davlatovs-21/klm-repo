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

test("температура выше 40 °C снижает допустимый ток и поднимает номинал", () => {
  assert.equal(derating(35), 1);
  assert.equal(derating(50), 0.9);
  const cold = run({ mode: "current", currentA: 1150, demand: 1, ambientC: 35, taps: [] });
  const hot = run({ mode: "current", currentA: 1150, demand: 1, ambientC: 50, taps: [] });
  assert.equal(cold.ratedA, 1250);
  assert.equal(hot.ratedA, 1600);
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
