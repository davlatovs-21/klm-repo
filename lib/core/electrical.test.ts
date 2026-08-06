import { test } from "node:test";
import assert from "node:assert/strict";
import {
  voltageDrop, powerLosses, shortCircuit, peakFactor, thermalExpansion, hangers,
  ALPHA, DROP_LIMITS, PEAK_FACTOR_DEFAULT,
} from "./electrical";

/* Значения R и X — синтетические, порядок величины типовой для ШМА 1250 А в меди.
   Реальные придут от КЛМ (docs/etap-0, электрические характеристики по номиналам). */
const R = 0.05; // Ом/км
const X = 0.03; // Ом/км

/* ── 7.4 падение напряжения ─────────────────────────────────────── */

test("падение напряжения: сосредоточенная нагрузка в конце трассы", () => {
  const r = voltageDrop({ currentA: 1026, lengthM: 120, rOhmKm: R, xOhmKm: X, cosPhi: 0.9, voltageV: 400 });
  // Z_эф = 0,05·0,9 + 0,03·0,4359 = 0,058077 Ом/км
  assert.equal(r.zEffOhmKm, 0.0581);
  // ΔU = 1,732 · 1026 · 0,12 · 0,058077 = 12,39 В
  assert.equal(r.deltaU_V, 12.38);
  assert.equal(r.deltaU_pct, 3.1);
  assert.ok(r.verdict.ok); // 3,1 % < 4 % для силовой нагрузки
});

test("питание из центра трассы уменьшает падение вдвое, с двух сторон — вчетверо", () => {
  const base = { currentA: 1000, lengthM: 100, rOhmKm: R, xOhmKm: X, cosPhi: 0.9, voltageV: 400 };
  const end = voltageDrop({ ...base, feed: "end" });
  const center = voltageDrop({ ...base, feed: "center" });
  const both = voltageDrop({ ...base, feed: "both" });
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.02, `${a} ≉ ${b}`);
  near(center.deltaU_V, end.deltaU_V / 2);
  near(both.deltaU_V, end.deltaU_V / 4);
  assert.equal(center.effectiveLengthM, 50);
});

test("распределённая нагрузка считается по моменту, а не по полному току на полную длину", () => {
  const taps = [
    { currentA: 250, positionM: 20 },
    { currentA: 250, positionM: 50 },
    { currentA: 250, positionM: 80 },
  ];
  const distributed = voltageDrop({
    currentA: 750, lengthM: 80, rOhmKm: R, xOhmKm: X, cosPhi: 0.9, voltageV: 400, distributed: taps,
  });
  const lumped = voltageDrop({ currentA: 750, lengthM: 80, rOhmKm: R, xOhmKm: X, cosPhi: 0.9, voltageV: 400 });
  // момент = 250·20 + 250·50 + 250·80 = 37 500 м·А = 37,5 кА·м против 750·80 = 60 кА·м
  assert.ok(distributed.deltaU_V < lumped.deltaU_V);
  assert.equal(distributed.deltaU_V, Number((lumped.deltaU_V * (37500 / 60000)).toFixed(2)));
});

test("нормы потери напряжения разнесены по участкам сети, а не одна на всё", () => {
  assert.equal(DROP_LIMITS["tp-vru"].pct, 5);
  assert.equal(DROP_LIMITS.power.pct, 4);
  assert.equal(DROP_LIMITS.lighting.pct, 2.5);
  // 2,5 % на освещении не проходит там, где силовая ещё в норме
  // 700 А на 200 м → 3,52 %: силовую норму проходит, осветительную нет
  const arg = { currentA: 700, lengthM: 200, rOhmKm: R, xOhmKm: X, cosPhi: 0.9, voltageV: 400 } as const;
  assert.equal(voltageDrop(arg).deltaU_pct, 3.52);
  assert.ok(voltageDrop({ ...arg, role: "tp-vru" }).verdict.ok);
  assert.ok(voltageDrop({ ...arg, role: "power" }).verdict.ok);
  assert.ok(!voltageDrop({ ...arg, role: "lighting" }).verdict.ok);
});

test("превышение нормы — ошибка с указанием участка", () => {
  const r = voltageDrop({ currentA: 1600, lengthM: 300, rOhmKm: R, xOhmKm: X, cosPhi: 0.9, voltageV: 400, role: "power" });
  assert.equal(r.verdict.level, "error");
  assert.match(r.verdict.text, /превышает 4 %/);
  assert.ok(r.trace.some((s) => s.norm?.includes("СП 256")));
});

/* ── 7.5 потери и TCO ───────────────────────────────────────────── */

test("потери мощности и стоимость за срок службы", () => {
  const r = powerLosses({
    currentA: 1000, rOhmKm: R, lengthM: 100, hoursPerYear: 4000, tariffPerKWh: 6, years: 25,
  });
  // ΔP = 3 · 1000² · 0,05 · 0,1 / 1000 = 15 кВт
  assert.equal(r.deltaP_kW, 15);
  assert.equal(r.energyPerYear_kWh, 60000);
  assert.equal(r.costPerYear, 360000);
  assert.equal(r.costLifetime, 9000000);
});

test("равномерно распределённая нагрузка даёт втрое меньшие потери", () => {
  const arg = { currentA: 1000, rOhmKm: R, lengthM: 100, hoursPerYear: 4000, tariffPerKWh: 6, years: 25 };
  const lumped = powerLosses(arg);
  const spread = powerLosses({ ...arg, uniformlyDistributed: true });
  assert.equal(spread.deltaP_kW, Number((lumped.deltaP_kW / 3).toFixed(3)));
});

/* ── 7.6 токи КЗ ────────────────────────────────────────────────── */

test("ток КЗ на выводах трансформатора по ГОСТ 28249-93", () => {
  // 1000 кВ·А, 400 В, uк 5,5 % → Zт = 5,5·400²/(100·10⁶) = 0,0088 Ом → Iк ≈ 26,2 кА
  const r = shortCircuit({ voltageV: 400, transformerKVA: 1000, ukPct: 5.5, icwKA: 50, ipkKA: 105 });
  assert.equal(r.ztOhm, 0.0088);
  assert.equal(r.ikKA, 26.24);
  assert.equal(r.peakFactor, PEAK_FACTOR_DEFAULT);
  assert.equal(r.ipkKA, 66.8); // 1,8 · √2 · 26,24
  assert.ok(r.checks.every((c) => c.ok));
});

test("ударный коэффициент считается по R/X, а не берётся всегда 1,8", () => {
  assert.equal(peakFactor(), 1.8); // R/X неизвестно — верхняя граница, в запас
  assert.equal(peakFactor(0, 0.03), 1.8); // нулевое R не даёт информации
  const soft = peakFactor(0.05, 0.03); // R/X = 1,67 → сильно затухающий контур
  assert.ok(soft > 1 && soft < 1.1);
  const stiff = peakFactor(0.005, 0.05); // R/X = 0,1 → близко к предельным 2,0
  assert.ok(stiff > 1.7 && stiff <= 2);
  assert.ok(stiff > soft);
});

test("шинопровод, не выдерживающий КЗ, отбраковывается по обоим критериям", () => {
  const r = shortCircuit({ voltageV: 400, faultCurrentKA: 40, icwKA: 25, ipkKA: 50 });
  assert.equal(r.ikKA, 40);
  assert.equal(r.checks.filter((c) => !c.ok).length, 2);
  assert.match(r.checks[0].text, /не выдержит КЗ/);
  assert.match(r.checks[1].text, /электродинамическая стойкость/);
});

test("без тока КЗ и без данных трансформатора расчёт не делает вид, что посчитал", () => {
  assert.throws(() => shortCircuit({ voltageV: 400, icwKA: 50, ipkKA: 105 }), /мощность трансформатора/);
});

/* ── 7.7 тепловое расширение ────────────────────────────────────── */

test("удлинение трассы и число компенсаторов", () => {
  // Al, 120 м, ΔT 40 °C → 23e-6 · 120000 · 40 = 110,4 мм
  const r = thermalExpansion({ material: "Al", lengthM: 120, deltaTC: 40, jointToleranceMm: 15 });
  assert.equal(r.deltaLMm, 110.4);
  assert.equal(r.compensators, 7); // ⌈110,4/15⌉ − 1 = 8 − 1
  assert.equal(r.spanM, 15);
});

test("медь расширяется меньше алюминия — компенсаторов нужно меньше", () => {
  const arg = { lengthM: 120, deltaTC: 40, jointToleranceMm: 15 } as const;
  const al = thermalExpansion({ ...arg, material: "Al" });
  const cu = thermalExpansion({ ...arg, material: "Cu" });
  assert.ok(cu.deltaLMm < al.deltaLMm);
  assert.ok(cu.compensators < al.compensators);
  assert.equal(ALPHA.Al / ALPHA.Cu, 23 / 17);
});

test("на деформационном шве компенсатор обязателен даже при малом расширении", () => {
  const r = thermalExpansion({ material: "Cu", lengthM: 10, deltaTC: 20, jointToleranceMm: 15, buildingJoints: 2 });
  assert.ok(r.deltaLMm < 15);
  assert.equal(r.compensators, 2);
});

/* ── 7.8 подвесы ────────────────────────────────────────────────── */

test("число подвесов и нагрузка на каждый", () => {
  const r = hangers({ lengthM: 120, pitchM: 2.5, heavyPoints: 3, weightPerMKg: 18, safety: 1.5 });
  assert.equal(r.count, 52); // ⌈120/2,5⌉ + 1 + 3
  assert.equal(r.loadPerHangerKg, 67.5); // 18 · 2,5 · 1,5
});

/* ── трассировка ────────────────────────────────────────────────── */

test("каждый расчёт возвращает трассировку с формулой и подстановкой (раздел 7.12)", () => {
  const all = [
    voltageDrop({ currentA: 1000, lengthM: 100, rOhmKm: R, xOhmKm: X, cosPhi: 0.9, voltageV: 400 }).trace,
    powerLosses({ currentA: 1000, rOhmKm: R, lengthM: 100, hoursPerYear: 4000, tariffPerKWh: 6, years: 25 }).trace,
    shortCircuit({ voltageV: 400, transformerKVA: 1000, ukPct: 5.5, icwKA: 50, ipkKA: 105 }).trace,
    thermalExpansion({ material: "Al", lengthM: 120, deltaTC: 40, jointToleranceMm: 15 }).trace,
    hangers({ lengthM: 120, pitchM: 2.5, weightPerMKg: 18 }).trace,
  ];
  for (const trace of all) {
    assert.ok(trace.length > 0);
    for (const step of trace) {
      assert.ok(step.what.length > 0);
      assert.ok(step.result.length > 0);
    }
    assert.ok(trace.some((s) => s.formula), "хотя бы один шаг показывает формулу");
  }
  // ссылки на нормативы проставлены там, где расчёт нормируется
  assert.ok(
    shortCircuit({ voltageV: 400, transformerKVA: 1000, ukPct: 5.5, icwKA: 50, ipkKA: 105 })
      .trace.some((s) => s.norm?.includes("ГОСТ 28249-93")),
  );
});
