/**
 * История правок для отмены и повтора — ТЗ M3.8.
 *
 * Чистые функции без React и без часов: время передаётся аргументом, поэтому
 * склейка быстрых правок проверяется тестами, а не наблюдением за мышкой.
 *
 * Зачем склейка: перетаскивание отвода и набор числа в поле порождают десятки
 * изменений подряд. Без неё Ctrl+Z откатывал бы по одному пикселю и по одной
 * цифре, то есть был бы бесполезен.
 */

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** Когда последний раз менялось состояние, мс — точка отсчёта для склейки */
  lastAtMs: number;
};

export type PushOptions = {
  /** Правки, пришедшие в этом окне после предыдущей, склеиваются в одну */
  coalesceMs?: number;
  /** Глубина истории: дальше самые старые шаги забываются */
  limit?: number;
};

export const DEFAULT_COALESCE_MS = 600;
export const DEFAULT_LIMIT = 100;

export const initHistory = <T>(present: T, atMs = 0): History<T> => ({
  past: [],
  present,
  future: [],
  lastAtMs: atMs,
});

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Новое состояние. Повтор того же значения историю не засоряет.
 * Любая правка обнуляет очередь повтора — ветвление истории не поддерживается
 * сознательно: пользователю его невозможно объяснить.
 */
export function pushHistory<T>(h: History<T>, next: T, atMs: number, opts: PushOptions = {}): History<T> {
  const coalesceMs = opts.coalesceMs ?? DEFAULT_COALESCE_MS;
  const limit = opts.limit ?? DEFAULT_LIMIT;

  if (same(h.present, next)) return h;

  // быстрая правка следом за предыдущей заменяет её, а не добавляет шаг
  if (atMs - h.lastAtMs < coalesceMs && h.past.length > 0)
    return { ...h, present: next, future: [], lastAtMs: atMs };

  const past = [...h.past, h.present];
  return {
    past: past.length > limit ? past.slice(past.length - limit) : past,
    present: next,
    future: [],
    lastAtMs: atMs,
  };
}

export const canUndo = <T>(h: History<T>) => h.past.length > 0;
export const canRedo = <T>(h: History<T>) => h.future.length > 0;

export function undo<T>(h: History<T>): History<T> {
  if (!canUndo(h)) return h;
  const previous = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future],
    // отмена сбрасывает окно склейки: следующая правка обязана стать своим шагом.
    // Именно −Infinity, а не ноль: вызывающий может передать сколь угодно малое время
    lastAtMs: -Infinity,
  };
}

export function redo<T>(h: History<T>): History<T> {
  if (!canRedo(h)) return h;
  const [next, ...rest] = h.future;
  return { past: [...h.past, h.present], present: next, future: rest, lastAtMs: -Infinity };
}

/**
 * Разбор сочетания клавиш. Отдельной функцией, потому что раскладка сочетаний —
 * это правило, а не разметка: Ctrl+Z и Cmd+Z отменяют, Ctrl+Shift+Z, Cmd+Shift+Z
 * и Ctrl+Y повторяют.
 */
export type HistoryKey = "undo" | "redo" | null;

export function historyKey(e: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): HistoryKey {
  if (!e.ctrlKey && !e.metaKey) return null;
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  // Ctrl+Y — привычный повтор в Windows; с Cmd не сочетается
  if (key === "y" && e.ctrlKey && !e.metaKey) return "redo";
  return null;
}
