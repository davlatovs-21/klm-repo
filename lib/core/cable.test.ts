import { test } from "node:test";
import assert from "node:assert/strict";
import { selectCable, compareWithCable, CABLE_AMPACITY, RHO } from "./cable";

test("сечение подбирается по ряду ПУЭ, ток укладывается в допустимый", () => {
  const c = selectCable(200, 100, "Cu");
  assert.equal(c.sectionMm2, 95); // 220 А ≥ 200 А, предыдущие 70 мм² дают 180 А
  assert.equal(c.runs, 1);
  assert.equal(c.ampacityTotalA, 220);
});

test("алюминий требует большего сечения на тот же ток", () => {
  const cu = selectCable(200, 100, "Cu");
  const al = selectCable(200, 100, "Al");
  assert.equal(al.sectionMm2, 120); // 200 А — ровно по границе
  assert.ok(al.sectionMm2 > cu.sectionMm2);
});

test("большой ток набирается кабелями в параллель, а не молча обрезается", () => {
  const c = selectCable(1250, 100, "Cu");
  assert.equal(c.sectionMm2, 185); // конец ряда
  assert.equal(c.runs, 4); // ⌈1250 / 350⌉
  assert.equal(c.ampacityTotalA, 1400);
  assert.match(c.label, /^4 × кабель 3×185/);
});

test("параллельные кабели снижают сопротивление трассы пропорционально", () => {
  const one = selectCable(300, 100, "Cu"); // 150 мм², 1 кабель
  const four = selectCable(1250, 100, "Cu"); // 185 мм², 4 кабеля
  // R = ρ·1000/S/runs
  assert.equal(one.rOhmKm, Number(((RHO.Cu * 1000) / 150).toFixed(5)));
  assert.equal(four.rOhmKm, Number(((RHO.Cu * 1000) / 185 / 4).toFixed(5)));
  assert.ok(four.rOhmKm < one.rOhmKm);
});

test("масса металла жил считается по сечению, длине и плотности", () => {
  // 4 кабеля × 3 жилы × 185 мм² × 100 м × 8960 кг/м³
  const c = selectCable(1250, 100, "Cu");
  assert.equal(c.conductorMassKg, 1989.1);
});

test("сравнение считает кабель целиком, а шинопровод — только при заданном R", () => {
  const arg = {
    currentA: 1250, lengthM: 100, conductor: "Cu" as const,
    hoursPerYear: 4000, tariffPerKWh: 6, years: 25,
  };
  const blind = compareWithCable({ ...arg, busbarROhmKm: null });
  assert.ok(blind.cable.deltaP_kW > 0);
  assert.equal(blind.busbar, null);
  assert.equal(blind.savingLifetime, null);
  assert.ok(blind.notes.some((n) => n.includes("02-elektricheskie-harakteristiki.csv")));

  const known = compareWithCable({ ...arg, busbarROhmKm: 0.02, busbarWeightPerMKg: 18 });
  assert.ok(known.busbar);
  assert.ok(known.busbar!.deltaP_kW < known.cable.deltaP_kW);
  assert.ok(known.savingLifetime! > 0);
  assert.ok(known.lossRatio! > 1);
  assert.equal(known.busbar!.metalMassKg, 1800);
});

test("потери считаются по той же формуле, что в electrical.ts", () => {
  // ΔP = 3·I²·R·L/1000; R кабеля 3×185 Cu в 4 нити = 0,02549 Ом/км
  const r = compareWithCable({
    currentA: 1250, lengthM: 100, conductor: "Cu", busbarROhmKm: null,
    hoursPerYear: 4000, tariffPerKWh: 6, years: 25,
  });
  const expected = Number(((3 * 1250 ** 2 * r.cable.rOhmKm * 0.1) / 1000).toFixed(3));
  assert.equal(r.cable.deltaP_kW, expected);
  assert.equal(r.cable.energyPerYear_kWh, Math.round(expected * 4000));
  assert.equal(r.cable.costLifetime, r.cable.energyPerYear_kWh * 6 * 25);
});

test("капитальные затраты честно помечены как непосчитанные", () => {
  const r = compareWithCable({
    currentA: 630, lengthM: 80, conductor: "Al", busbarROhmKm: 0.05,
    hoursPerYear: 4000, tariffPerKWh: 6, years: 25,
  });
  assert.ok(r.notes.some((n) => n.includes("Капитальные затраты") && n.includes("прайс")));
});

test("ряд ПУЭ монотонен: больше сечение — больше допустимый ток", () => {
  for (const table of Object.values(CABLE_AMPACITY))
    for (let i = 1; i < table.length; i++) {
      assert.ok(table[i][0] > table[i - 1][0], "сечения по возрастанию");
      assert.ok(table[i][1] > table[i - 1][1], "токи по возрастанию");
    }
});
