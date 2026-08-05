/**
 * Подбор шинопровода: расчётный ток → серия, номинал, материал, IP.
 * Не зависит от интерфейса. Справочник — lib/klm-catalog.ts.
 */

import {
  IP_ENV,
  TAP_BOXES,
  TAP_WINDOW_MAX,
  seriesByDuty,
  src,
  type BusMaterial,
  type BusbarSeries,
  type Duty,
} from "./klm-catalog";

export type Input = {
  duty: Duty;
  /** Ввод по мощности нагрузки или сразу по току */
  mode: "power" | "current";
  powerKW: number;
  cosPhi: number;
  /** Коэффициент одновременности (спроса) */
  demand: number;
  currentA: number;
  voltageV: number;
  ambientC: number;
  /** Ключ из IP_ENV */
  env: string;
  material: BusMaterial | "any";
  /** Требуемая огнестойкость, минуты: 0 / 60 / 120 */
  fireE: 0 | 60 | 120;
  routeLenM: number;
  /** Токи отводов, А — только для распределительной трассы */
  taps: number[];
};

export const DEFAULT_INPUT: Input = {
  duty: "main",
  mode: "power",
  powerKW: 800,
  cosPhi: 0.9,
  demand: 0.8,
  currentA: 1600,
  voltageV: 400,
  ambientC: 35,
  env: "dry",
  material: "any",
  fireE: 0,
  routeLenM: 60,
  taps: [],
};

export type Check = { level: "error" | "warn" | "info"; text: string; fix?: string };

export type Result = {
  series: BusbarSeries;
  /** Расчётный ток нагрузки, А */
  loadA: number;
  /** Ток с поправкой на температуру — по нему выбирается номинал */
  requiredA: number;
  /** Подобранный номинал, А; null — за пределами ряда серии */
  ratedA: number | null;
  material: BusMaterial;
  ip: number;
  /** Запас по току относительно расчётного, % */
  reservePct: number;
  derating: number;
  /** Число секций трассы по максимальной длине секции */
  sections: number;
  /** Подобранные КОМ под токи отводов */
  tapBoxes: { requestedA: number; boxA: number | null; viaSection: boolean }[];
  checks: Check[];
  productPath: string | null;
  sourceUrl: string;
};

/**
 * Снижение допустимого тока от температуры среды.
 * ponytail: линейная аппроксимация 1 %/°C выше 40 °C — заменить таблицей КЛМ,
 * когда заказчик передаст кривые derating по ГОСТ Р МЭК 61439-6.
 */
export function derating(ambientC: number): number {
  if (ambientC <= 40) return 1;
  return Math.max(0.6, 1 - 0.01 * (ambientC - 40));
}

const nextRated = (currents: number[], need: number) => currents.find((c) => c >= need) ?? null;
const round = (x: number, n = 0) => Number(x.toFixed(n));

/** Артикул страницы каталога для конкретного номинала */
function productPath(s: BusbarSeries, rated: number | null): string | null {
  if (rated == null) return null;
  if (s.duty === "main") return `${s.source}/shma-${rated}a`;
  if (s.duty === "distribution") return `${s.source}/shra-${rated}a`;
  return null;
}

export function selectBusbar(input: Input): Result {
  const s = seriesByDuty(input.duty);
  const checks: Check[] = [];

  const u = input.voltageV;
  const loadA =
    input.mode === "current"
      ? input.currentA * input.demand
      : (input.powerKW * 1000 * input.demand) / (Math.sqrt(3) * u * input.cosPhi);

  const k = derating(input.ambientC);
  const requiredA = loadA / k;
  const ratedA = nextRated(s.currents, requiredA);

  // --- напряжение ---
  if (u > s.voltageV)
    checks.push({
      level: "error",
      text: `${u} В выше рабочего напряжения серии ${s.name} (${s.voltageV} В)`,
      fix: s.duty === "mv" ? undefined : "для 6–35 кВ — токопровод ТПЛ",
    });

  // --- номинал ---
  const maxRated = s.currents[s.currents.length - 1];
  if (ratedA == null)
    checks.push({
      level: "error",
      text: `Расчётный ток ${round(requiredA)} А выше ряда серии ${s.name} (максимум ${maxRated} А)`,
      fix: "две параллельные трассы или сдвоенные секции — по запросу в КЛМ",
    });

  // --- материал ---
  let material: BusMaterial = input.material === "any" ? (s.materials.includes("Al") ? "Al" : "Cu") : input.material;
  if (ratedA != null && s.copperOnly.includes(ratedA)) {
    if (input.material === "Al")
      checks.push({
        level: "warn",
        text: `${s.name} ${ratedA} А выпускается только в меди`,
        fix: "материал шин изменён на Cu",
      });
    material = "Cu";
  }
  if (!s.materials.includes(material)) {
    material = s.materials[0];
    checks.push({ level: "warn", text: `Серия ${s.name} доступна только в ${s.materials.join(" / ")}` });
  }

  // --- среда и IP ---
  const wantIp = IP_ENV.find((e) => e.key === input.env)?.ip ?? 54;
  const ip = s.ip.includes(wantIp) ? wantIp : Math.max(...s.ip.filter((x) => x <= wantIp), Math.min(...s.ip));
  if (ip < wantIp)
    checks.push({
      level: "warn",
      text: `Для этой среды нужен IP${wantIp}, серия ${s.name} даёт максимум IP${Math.max(...s.ip)}`,
      fix: "литой магистральный шинопровод IP68",
    });

  // --- огнестойкость ---
  if (input.fireE > 0 && s.duty !== "main")
    checks.push({
      level: "warn",
      text: `Огнестойкость E${input.fireE} подтверждена для магистрального ШМА`,
      fix: "огнестойкий участок трассы выполнить на KLM-S",
    });

  // --- отводы ---
  const tapBoxes = input.taps.map((requestedA) => ({
    requestedA,
    boxA: nextRated(TAP_BOXES, requestedA),
    viaSection: requestedA > TAP_WINDOW_MAX,
  }));

  if (input.taps.length > 0 && s.tapMaxA == null)
    checks.push({
      level: "error",
      text: `${s.name} не имеет окон отбора по длине`,
      fix: "распределение выполнить на KLM-R, магистраль оставить на KLM-S",
    });

  if (s.tapMaxA != null) {
    for (const t of tapBoxes) {
      if (t.boxA == null)
        checks.push({ level: "error", text: `Отвод ${t.requestedA} А выше ряда КОМ (максимум ${TAP_BOXES.at(-1)} А)` });
      else if (t.viaSection)
        checks.push({
          level: "warn",
          text: `Отвод ${t.requestedA} А больше ${TAP_WINDOW_MAX} А на окно`,
          fix: `КОМ ${t.boxA} А ставится на секцию отбора, не в стандартное окно`,
        });
    }
    const tapSum = input.taps.reduce((a, b) => a + b, 0);
    if (ratedA != null && tapSum > ratedA)
      checks.push({
        level: "error",
        text: `Сумма отводов ${tapSum} А превышает номинал магистрали ${ratedA} А`,
        fix: "поднять номинал трассы или разнести нагрузку на две трассы",
      });

    const pitch = Math.min(...s.tapPitchM);
    const windows = Math.floor(input.routeLenM / pitch);
    if (input.taps.length > windows)
      checks.push({
        level: "error",
        text: `${input.taps.length} отводов не помещается на ${input.routeLenM} м при шаге ${pitch} м (${windows} окон)`,
      });
  }

  // --- подсказки по компоновке ---
  if (s.duty === "distribution" && requiredA > 1600)
    checks.push({
      level: "info",
      text: "Ток выше ряда ШРА — типовая схема: магистраль KLM-S до этажного щита, ШРА на этаже",
    });
  if (s.duty === "main" && ratedA != null && ratedA >= 4000)
    checks.push({ level: "info", text: "Для ЦОД от 4000 А закладывайте резервирование 2N — два независимых луча" });

  const sections = Math.ceil((input.routeLenM * 1000) / s.sectionLenMm[1]);
  const path = productPath(s, ratedA);

  return {
    series: s,
    loadA: round(loadA),
    requiredA: round(requiredA),
    ratedA,
    material,
    ip,
    reservePct: ratedA != null ? round(((ratedA - loadA) / loadA) * 100) : 0,
    derating: k,
    sections,
    tapBoxes,
    checks,
    productPath: path,
    sourceUrl: src(path ?? s.source),
  };
}

export const DUTIES: { key: Duty; label: string; desc: string }[] = [
  { key: "main", label: "Магистраль", desc: "Транспорт мощности от трансформатора к ГРЩ или зоне нагрузки" },
  { key: "distribution", label: "Распределение", desc: "Раздача по длине трассы через коробки отбора мощности" },
  { key: "mobile", label: "Подвижная нагрузка", desc: "Краны, конвейеры, монорельсы — питание через каретку" },
  { key: "mv", label: "Среднее напряжение", desc: "Токопровод 6 / 10 / 35 кВ между трансформаторами и РУ" },
];

export const VOLTAGES: Record<Duty, number[]> = {
  main: [400, 690, 1000],
  distribution: [400, 690],
  mobile: [400, 690],
  mv: [6000, 10000, 35000],
};

/** Готовые сценарии для быстрой проверки логики из интерфейса */
export const PRESETS: { name: string; input: Input }[] = [
  {
    name: "ЦОД 2,5 МВт · машзал",
    input: { ...DEFAULT_INPUT, duty: "main", powerKW: 2500, demand: 0.9, env: "dry", fireE: 120, routeLenM: 120, taps: [] },
  },
  {
    name: "Цех · трасса с отводами",
    input: {
      ...DEFAULT_INPUT,
      duty: "distribution",
      powerKW: 400,
      demand: 0.7,
      env: "dusty",
      routeLenM: 80,
      taps: [32, 63, 63, 125, 160],
    },
  },
  {
    name: "Кран-балка 250 А",
    input: { ...DEFAULT_INPUT, duty: "mobile", mode: "current", currentA: 250, demand: 1, env: "dusty", routeLenM: 40, taps: [] },
  },
  {
    name: "Подстанция 10 кВ",
    input: { ...DEFAULT_INPUT, duty: "mv", mode: "current", currentA: 4000, demand: 1, voltageV: 10000, env: "outdoor", routeLenM: 30, taps: [] },
  },
  {
    name: "Ошибка: отвод 400 А в окно ШРА",
    input: { ...DEFAULT_INPUT, duty: "distribution", powerKW: 300, routeLenM: 30, taps: [400, 160] },
  },
];
