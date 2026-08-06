import { test } from "node:test";
import assert from "node:assert/strict";
import { runChecks, buildCode, codeString, encodeConfig, decodeConfig, DEFAULT_CONFIG, PRESETS, type Config } from "./engine";

const check = (s: Config, rule: string) => runChecks(s).checks.find((c) => c.name === rule)!;

test("строка заказа собирается из артикулов каталога", () => {
  assert.equal(codeString(DEFAULT_CONFIG), "TAPP-OFF-63A SHRA-630A Al IP55 4P C Y0 x1");
  assert.equal(buildCode(DEFAULT_CONFIG).length, 8);
});

test("типовая конфигурация проходит и подбирает корпус своего номинала", () => {
  const r = runChecks(DEFAULT_CONFIG);
  assert.ok(r.ok);
  assert.equal(r.box?.sku, "TAPP-OFF-63A");
  assert.equal(r.box?.ratedA, 63);
});

test("разные токи отвода дают разные корпуса, а не один и тот же", () => {
  const box = (a: number) => runChecks({ ...DEFAULT_CONFIG, busCurrent: 1600, tapCurrent: a, handle: true }).box?.ratedA;
  assert.deepEqual([16, 32, 63, 125, 160, 250, 400, 630].map(box), [16, 32, 63, 125, 160, 250, 400, 630]);
});

test("аппарат защиты следует из номинала корпуса", () => {
  assert.equal(runChecks({ ...DEFAULT_CONFIG, tapCurrent: 32 }).box?.device, "Автомат C/D");
  assert.equal(
    runChecks({ ...DEFAULT_CONFIG, tapCurrent: 160, handle: true }).box?.device,
    "Автомат с термомагнитным расцепителем",
  );
});

test("KLM-S — магистральный ШМА без окон отбора, КОМ на него не ставится", () => {
  const r = runChecks({ ...DEFAULT_CONFIG, series: "S" });
  assert.equal(check({ ...DEFAULT_CONFIG, series: "S" }, "Серия под отводы").ok, false);
  assert.equal(r.box, null);
});

test("КОМ совместимы с ШРА 250–1600 А", () => {
  assert.equal(check({ ...DEFAULT_CONFIG, busCurrent: 160 }, "Совместимость с магистралью").ok, false);
  assert.equal(check({ ...DEFAULT_CONFIG, busCurrent: 250 }, "Совместимость с магистралью").ok, true);
});

test("лимит магистрали — её номинал, а не доля от него", () => {
  const r = runChecks({ ...DEFAULT_CONFIG, busCurrent: 630, tapCurrent: 125, tapCount: 4, handle: true });
  assert.equal(r.limit, 630);
  assert.equal(r.total, 500);
  assert.equal(check({ ...DEFAULT_CONFIG, busCurrent: 630, tapCurrent: 125, tapCount: 4, handle: true }, "Нагрузка на магистраль").ok, true);
  assert.equal(check({ ...DEFAULT_CONFIG, busCurrent: 630, tapCurrent: 250, tapCount: 3, handle: true }, "Нагрузка на магистраль").ok, false);
});

test("выше 250 А корпус идёт на секцию отбора — предупреждение, не запрет", () => {
  const s: Config = { ...DEFAULT_CONFIG, busCurrent: 1600, tapCurrent: 400, handle: true };
  const c = check(s, "Способ подключения");
  assert.equal(c.ok, true);
  assert.equal(c.warn, true);
  assert.ok(runChecks(s).ok);
});

test("правила ловят нарушения", () => {
  assert.equal(check({ ...DEFAULT_CONFIG, tapCurrent: 125, handle: false }, "Рукоятка управления").ok, false);
  assert.equal(check({ ...DEFAULT_CONFIG, busIP: 55, boxIP: 54 }, "Степень защиты корпуса").ok, false);
  assert.equal(check({ ...DEFAULT_CONFIG, boxIP: 65 }, "Степень защиты корпуса").ok, false);
  assert.equal(check({ ...DEFAULT_CONFIG, poles: 3 }, "Число проводников").ok, false);
});

test("исправление приводит параметр к допустимому значению (сценарий 7 ТЗ)", () => {
  const bad = PRESETS.find((p) => p.bad)!.state;
  let s = bad;
  for (let i = 0; i < 12 && !runChecks(s).ok; i++) {
    const broken = runChecks(s).checks.find((c) => !c.ok && c.fix);
    if (!broken) break;
    s = { ...s, ...broken.fix };
  }
  assert.ok(runChecks(s).ok, "конфликтный пресет чинится кнопками исправления");
});

test("позиция не подбирается, пока есть нарушения (пункт 6.2 ТЗ)", () => {
  assert.equal(runChecks({ ...DEFAULT_CONFIG, series: "S" }).box, null);
});

test("ссылка на конфигурацию восстанавливает параметры (сценарий 8 ТЗ)", () => {
  for (const p of PRESETS) assert.deepEqual(decodeConfig(encodeConfig(p.state)), p.state);
});

test("рабочие пресеты проходят проверку, конфликтный — нет", () => {
  for (const p of PRESETS) assert.equal(runChecks(p.state).ok, !p.bad, p.name);
});
