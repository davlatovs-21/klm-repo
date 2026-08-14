/**
 * Справочник подмодуля «КОМ» (коробка отбора мощности).
 *
 * Серии шинопровода НЕ дублируются здесь: единственный источник — lib/klm-catalog.ts.
 * Раньше в этом файле лежал выдуманный ряд, в котором KLM-S был «осветительным»
 * с отводами до 100 А, а KLM-R — «распределительным» от 250 А. По данным завода:
 *   KLM-S — магистральный ШМА (сэндвич) 160–6300 А. Отбор мощности есть:
 *     Plug-in в окно секции Pi до 630 А, Bolt-on на стык секций до 1250 А
 *     (каталог V3, стр. 24). Прежнее «окон отбора нет» опровергнуто каталогом.
 *   KLM-R — распределительный ШРА 100–1600 А с окнами отбора, КОМ ставятся на 250–1600 А
 *     (данные сайта; в каталоге V3 буква R закреплена за другим изделием, см.
 *     открытый вопрос в data/klm-catalog/README.md).
 */

import {
  SERIES as BUSBARS,
  TAP_BOXES,
  TAP_BOXES_FULL,
  TAP_BOX_IP,
  TAP_BOX_POLES,
  TAP_BOX_VOLTAGE_V,
  TAP_WINDOW_MAX,
  boxFor,
  type BusMaterial,
  type BusbarSeries,
  type TapBox,
} from "./klm-catalog";

export type SeriesKey = "S" | "R";
export type Material = BusMaterial;
export type { TapBox, BusbarSeries };

const byKey = (k: SeriesKey) => BUSBARS.find((s) => s.key === k)!;

/** Серии, на которых имеет смысл подбирать КОМ. Данные — из klm-catalog. */
export const SERIES: Record<SeriesKey, BusbarSeries> = { S: byKey("S"), R: byKey("R") };
export const SERIES_KEYS: SeriesKey[] = ["S", "R"];

/** Короткое пояснение к серии для строки выбора */
export const SERIES_HINT: Record<SeriesKey, string> = {
  S: "магистраль от трансформатора к ГРЩ; отбор — Plug-in в окно до 630 А, Bolt-on на стык до 1250 А",
  R: "раздача по длине трассы через окна отбора — сюда встают КОМ",
};

/** Ряд токов отвода = ряд номиналов КОМ. Промежуточных значений завод не делает. */
export const TAP_CURRENTS = TAP_BOXES;

export { TAP_BOXES_FULL, TAP_WINDOW_MAX, TAP_BOX_VOLTAGE_V, boxFor };

/** IP корпуса КОМ — только 54 и 55 */
export const BOX_IP = TAP_BOX_IP;
export const BOX_POLES = TAP_BOX_POLES;

export const IP_TEXT: Record<number, string> = {
  54: "пыль, брызги воды",
  55: "пыль, струи воды",
  65: "полная пылезащита",
  68: "литой корпус, наружная установка",
};

/**
 * Порог обязательной внешней рукоятки управления.
 * ponytail: 125 А — граница ряда, с которой корпус комплектуется автоматом
 * с термомагнитным расцепителем. Заглушка, ждёт подтверждения КЛМ (ТЗ, вопрос 8).
 */
export const HANDLE_THRESHOLD = 125;

/** Подключение КОМ к окну отбора — единственный способ в ряду КЛМ */
export const CONNECTION = "Болтовое соединение к окну отбора";
export const INSTALL_NOTE =
  "Монтаж под напряжением магистрали, при снятом напряжении бокса (ПУЭ)";

/** Артикул номинала магистрали на сайте: SHRA-630A / SHMA-1250A */
export const busSku = (k: SeriesKey, a: number) => `${k === "R" ? "SHRA" : "SHMA"}-${a}A`;

/**
 * Приведение конфигурации к возможностям серии: ряд токов, материал, проводники, IP.
 * Используется и при смене серии в интерфейсе, и кнопками «исправить».
 */
export function fitToSeries(k: SeriesKey, s: { busCurrent: number; material: Material; poles: number; busIP: number }) {
  const c = SERIES[k];
  const compatMin = c.tapBoxCompatA?.[0] ?? c.currents[0];
  return {
    series: k,
    busCurrent: c.currents.includes(s.busCurrent)
      ? s.busCurrent
      : (c.currents.find((x) => x >= Math.max(s.busCurrent, compatMin)) ?? c.currents[c.currents.length - 1]),
    material: c.materials.includes(s.material) ? s.material : c.materials[0],
    poles: c.poles.includes(s.poles) ? s.poles : c.poles[0],
    // ближайший достижимый IP снизу, а не первый в списке
    busIP: c.ip.includes(s.busIP) ? s.busIP : Math.max(...c.ip.filter((x) => x < s.busIP), c.ip[0]),
  };
}
