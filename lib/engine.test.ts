import { test } from "node:test";
import assert from "node:assert/strict";
import { runChecks, buildCode, codeString, encodeConfig, decodeConfig, DEFAULT_CONFIG, PRESETS, type Config } from "./engine";

const fail = (s: Config, rule: string) => runChecks(s).checks.find((c) => c.name === rule)!;

test("код заказа собирается по разделу 7 ТЗ", () => {
  assert.equal(codeString(DEFAULT_CONFIG), "KLM-R 06 Cu 55 4 1 PB 63 Y0");
  assert.equal(buildCode(DEFAULT_CONFIG).length, 9);
});

test("типовая конфигурация проходит и подбирает минимальный достаточный корпус", () => {
  const r = runChecks(DEFAULT_CONFIG);
  assert.ok(r.ok);
  assert.equal(r.model?.code, "КОМ-R63-P");
});

test("правила ловят нарушения", () => {
  assert.equal(fail({ ...DEFAULT_CONFIG, series: "S", material: "Cu" }, "Материал шин").ok, false);
  assert.equal(fail({ ...DEFAULT_CONFIG, series: "S", tapCurrent: 250 }, "Предел тока отвода").ok, false);
  assert.equal(fail({ ...DEFAULT_CONFIG, tapCount: 3, tapCurrent: 250 }, "Нагрузка на магистраль").ok, false);
  assert.equal(fail({ ...DEFAULT_CONFIG, protection: "none", tapCurrent: 100 }, "Аппарат защиты").ok, false);
  assert.equal(fail({ ...DEFAULT_CONFIG, tapCurrent: 125, handle: false }, "Рукоятка управления").ok, false);
  assert.equal(fail({ ...DEFAULT_CONFIG, busIP: 65, boxIP: 54 }, "Степень защиты").ok, false);
});

test("исправление приводит параметр к допустимому значению (сценарий 7 ТЗ)", () => {
  const bad = PRESETS.find((p) => p.bad)!.state;
  let s = bad;
  for (let i = 0; i < 10 && !runChecks(s).ok; i++) {
    const broken = runChecks(s).checks.find((c) => !c.ok && c.fix);
    if (!broken) break;
    s = { ...s, ...broken.fix };
  }
  assert.ok(runChecks(s).ok, "конфликтный пресет чинится кнопками исправления");
});

test("модель не подбирается, пока есть нарушения (пункт 6.2 ТЗ)", () => {
  assert.equal(runChecks({ ...DEFAULT_CONFIG, series: "S", material: "Cu" }).model, null);
});

test("ссылка на конфигурацию восстанавливает параметры (сценарий 8 ТЗ)", () => {
  const s = PRESETS[2].state;
  assert.deepEqual(decodeConfig(encodeConfig(s)), s);
});
