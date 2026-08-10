import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initHistory, pushHistory, undo, redo, canUndo, canRedo, historyKey,
  DEFAULT_COALESCE_MS, DEFAULT_LIMIT,
} from "./history";

const T0 = 1_000_000;
/** Правка заведомо за окном склейки — чтобы каждая становилась своим шагом */
const apart = (i: number) => T0 + i * (DEFAULT_COALESCE_MS + 1);

const seq = (...values: string[]) => {
  let h = initHistory(values[0], T0);
  values.slice(1).forEach((v, i) => { h = pushHistory(h, v, apart(i + 1)); });
  return h;
};

test("новое состояние становится текущим, предыдущее уходит в прошлое", () => {
  const h = seq("a", "b");
  assert.equal(h.present, "b");
  assert.deepEqual(h.past, ["a"]);
  assert.ok(canUndo(h));
  assert.ok(!canRedo(h));
});

test("отмена возвращает предыдущее состояние, повтор — отменённое", () => {
  const h = seq("a", "b", "c");
  const back = undo(h);
  assert.equal(back.present, "b");
  assert.deepEqual(back.future, ["c"]);

  const forward = redo(back);
  assert.equal(forward.present, "c");
  assert.equal(forward.future.length, 0);
});

test("отмена доходит до самого начала и там останавливается", () => {
  let h = seq("a", "b", "c");
  h = undo(undo(undo(h)));
  assert.equal(h.present, "a");
  assert.ok(!canUndo(h));
  assert.equal(undo(h).present, "a", "лишняя отмена ничего не ломает");
});

test("повтор без отмены ничего не делает", () => {
  const h = seq("a", "b");
  assert.equal(redo(h), h);
});

test("правка после отмены обнуляет очередь повтора", () => {
  let h = seq("a", "b", "c");
  h = undo(h);
  assert.deepEqual(h.future, ["c"]);
  h = pushHistory(h, "d", apart(9));
  assert.equal(h.present, "d");
  assert.equal(h.future.length, 0, "ветвление истории не поддерживается");
  assert.deepEqual(h.past, ["a", "b"]);
});

test("повтор того же значения историю не засоряет", () => {
  const h = seq("a", "b");
  const again = pushHistory(h, "b", apart(5));
  assert.equal(again, h, "объект тот же — состояние не менялось");
  assert.deepEqual(again.past, ["a"]);
});

test("одинаковые по содержимому объекты считаются тем же состоянием", () => {
  const h = initHistory({ n: 1, list: [1, 2] }, T0);
  const again = pushHistory(h, { n: 1, list: [1, 2] }, apart(1));
  assert.equal(again.past.length, 0);
});

/* ── склейка быстрых правок ─────────────────────────────────────── */

test("правки в пределах окна склеиваются в один шаг отмены", () => {
  // так выглядит перетаскивание отвода: десятки изменений подряд
  let h = initHistory("start", T0);
  h = pushHistory(h, "шаг", T0 + 5_000);
  // перетаскивание начинается позже окна склейки, поэтому это отдельный шаг,
  // а внутри него два десятка изменений сливаются в одно
  const dragStart = T0 + 5_000 + DEFAULT_COALESCE_MS + 1;
  for (let i = 1; i <= 20; i++) h = pushHistory(h, `тянем-${i}`, dragStart + i * 20);

  assert.equal(h.present, "тянем-20");
  assert.deepEqual(h.past, ["start", "шаг"], "перетаскивание — один шаг, а не двадцать");
  assert.equal(undo(h).present, "шаг");
});

test("правка за окном склейки становится своим шагом", () => {
  let h = initHistory("a", T0);
  h = pushHistory(h, "b", T0 + 1_000);
  h = pushHistory(h, "c", T0 + 1_000 + DEFAULT_COALESCE_MS + 1);
  assert.deepEqual(h.past, ["a", "b"]);
});

test("первая правка не склеивается ни с чем, даже если пришла сразу", () => {
  const h = pushHistory(initHistory("a", T0), "b", T0 + 1);
  assert.deepEqual(h.past, ["a"], "иначе первое действие нечем было бы отменить");
});

test("после отмены следующая правка не склеивается с отменённой", () => {
  let h = seq("a", "b", "c");
  h = undo(h);
  h = pushHistory(h, "d", 0 + 1); // сразу после отмены, окно склейки сброшено
  assert.deepEqual(h.past, ["a", "b"]);
  assert.equal(undo(h).present, "b");
});

/* ── ограничение глубины ────────────────────────────────────────── */

test("история не растёт бесконечно: самые старые шаги забываются", () => {
  let h = initHistory("v0", T0);
  for (let i = 1; i <= DEFAULT_LIMIT + 25; i++) h = pushHistory(h, `v${i}`, apart(i));
  assert.equal(h.past.length, DEFAULT_LIMIT);
  assert.equal(h.past[0], `v${25}`, "начало истории вытеснено");
  assert.equal(h.present, `v${DEFAULT_LIMIT + 25}`);
});

test("глубина настраивается", () => {
  let h = initHistory("v0", T0);
  for (let i = 1; i <= 10; i++) h = pushHistory(h, `v${i}`, apart(i), { limit: 3 });
  assert.equal(h.past.length, 3);
  assert.deepEqual(h.past, ["v7", "v8", "v9"]);
});

/* ── сочетания клавиш ───────────────────────────────────────────── */

const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}) =>
  historyKey({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, ...mods });

test("Ctrl+Z и Cmd+Z отменяют", () => {
  assert.equal(key("z", { ctrlKey: true }), "undo");
  assert.equal(key("z", { metaKey: true }), "undo");
  assert.equal(key("Z", { metaKey: true }), "undo", "верхний регистр тоже");
});

test("Ctrl+Shift+Z, Cmd+Shift+Z и Ctrl+Y повторяют", () => {
  assert.equal(key("z", { ctrlKey: true, shiftKey: true }), "redo");
  assert.equal(key("z", { metaKey: true, shiftKey: true }), "redo");
  assert.equal(key("y", { ctrlKey: true }), "redo");
});

test("Cmd+Y не повтор — в macOS такого сочетания нет", () => {
  assert.equal(key("y", { metaKey: true }), null);
});

test("буквы без модификатора не трогают историю", () => {
  assert.equal(key("z"), null);
  assert.equal(key("y"), null);
  assert.equal(key("a", { ctrlKey: true }), null);
  assert.equal(key("Backspace", { ctrlKey: true }), null);
});
