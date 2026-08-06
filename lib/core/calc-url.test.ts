import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeInput, decodeInput } from "./calc-url";
import { DEFAULT_INPUT, PRESETS, selectBusbar, type Input } from "./select-busbar";

test("ссылка восстанавливает исходные данные без потерь", () => {
  for (const p of PRESETS) assert.deepEqual(decodeInput(encodeInput(p.input)), p.input, p.name);
});

test("в ссылку попадает только то, что отличается от значений по умолчанию", () => {
  assert.equal(encodeInput(DEFAULT_INPUT), "");
  assert.equal(encodeInput({ ...DEFAULT_INPUT, powerKW: 1200 }), "p=1200");
  assert.equal(decodeInput("").duty, DEFAULT_INPUT.duty);
});

test("пустая ссылка даёт конфигурацию по умолчанию, а не падение", () => {
  assert.deepEqual(decodeInput(""), DEFAULT_INPUT);
  assert.deepEqual(decodeInput("?"), DEFAULT_INPUT);
});

test("мусор в параметрах не подставляется молча, а заменяется значением по умолчанию", () => {
  const r = decodeInput("d=выдумка&m=hack&p=абв&cf=99&kc=-1&t=пусто&mw=нет&e=нет&mat=Au&fe=45");
  assert.equal(r.duty, DEFAULT_INPUT.duty);
  assert.equal(r.mode, DEFAULT_INPUT.mode);
  assert.equal(r.powerKW, DEFAULT_INPUT.powerKW);
  assert.equal(r.cosPhi, DEFAULT_INPUT.cosPhi); // 99 вне диапазона 0,1…1
  assert.equal(r.demand, DEFAULT_INPUT.demand);
  assert.equal(r.mountWay, DEFAULT_INPUT.mountWay);
  assert.equal(r.env, DEFAULT_INPUT.env);
  assert.equal(r.material, DEFAULT_INPUT.material);
  assert.equal(r.fireE, DEFAULT_INPUT.fireE);
});

test("напряжение приводится к ряду, допустимому для задачи трассы", () => {
  // 10 кВ не бывает у распределительной трассы — берётся первое из её ряда
  assert.equal(decodeInput("d=distribution&u=10000").voltageV, 400);
  assert.equal(decodeInput("d=mv&u=10000").voltageV, 10000);
});

test("список отводов чистится от мусора и ограничен по длине", () => {
  assert.deepEqual(decodeInput("taps=63,125,абв,-5,0,250").taps, [63, 125, 250]);
  assert.equal(decodeInput(`taps=${Array(200).fill(16).join(",")}`).taps.length, 64);
  assert.deepEqual(decodeInput("").taps, []);
});

test("восстановленная из ссылки конфигурация считается и не роняет ядро", () => {
  const shared = encodeInput({ ...DEFAULT_INPUT, duty: "distribution", powerKW: 400, taps: [32, 63, 125] } as Input);
  const r = selectBusbar(decodeInput(shared));
  assert.equal(r.series.name, "KLM-R");
  assert.equal(r.tapBoxes.length, 3);
});
