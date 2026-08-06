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
import type { TraceStep } from "./electrical";

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
  /** Способ прокладки: на ребро или плашмя (k_m, раздел 7.2) */
  mountWay: MountWay;
  /** Сколько параллельных трасс идёт рядом (k_g) */
  parallelRuns: number;
  /** Высота над уровнем моря, м (k_h) */
  altitudeM: number;
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
  mountWay: "edge",
  parallelRuns: 1,
  altitudeM: 0,
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
  /** Ток с поправкой на условия прокладки — по нему выбирается номинал */
  requiredA: number;
  /** Подобранный номинал, А; null — за пределами ряда серии */
  ratedA: number | null;
  material: BusMaterial;
  ip: number;
  /** Запас по току относительно расчётного, % */
  reservePct: number;
  /** Итоговая поправка k_t · k_m · k_g · k_h */
  derating: number;
  /** Разложение поправки по факторам раздела 7.2 */
  deratingParts: { kt: number; km: number; kg: number; kh: number };
  /** Число секций трассы по максимальной длине секции */
  sections: number;
  /** Подобранные КОМ под токи отводов */
  tapBoxes: { requestedA: number; boxA: number | null; viaSection: boolean }[];
  checks: Check[];
  /** Как получен ответ — раздел 7.12 ТЗ, печатается в расчётной записке */
  trace: TraceStep[];
  productPath: string | null;
  sourceUrl: string;
};

/**
 * Снижение допустимого тока от температуры среды.
 *
 * Номинальный ток шинопровода нормируется при среднесуточной температуре воздуха 35 °C
 * (максимум 40 °C) — ГОСТ Р МЭК 61439-1 / IEC 61439-1, отсчёт ведётся от 35 °C, не от 40 °C.
 * Ряд коэффициентов — типовая таблица шинопроводов этого класса (Canalis KS/KTA, k1):
 * 35 → 1,00 · 40 → 0,97 · 45 → 0,94 · 50 → 0,90 · 55 → 0,86, между точками линейно.
 *
 * ponytail: таблица отраслевая, не заводская. Заменить кривыми КЛМ по ГОСТ Р МЭК 61439-6,
 * когда заказчик их передаст (ТЗ, открытый вопрос 4). Ниже 35 °C повышающий коэффициент
 * не применяется сознательно — запас в пользу проекта.
 */
export const DERATING_TABLE: [number, number][] = [
  [35, 1], [40, 0.97], [45, 0.94], [50, 0.9], [55, 0.86],
];
/** Выше этой температуры таблицы нет — конфигурация уходит на согласование с заводом */
export const AMBIENT_MAX_C = DERATING_TABLE[DERATING_TABLE.length - 1][0];

export function derating(ambientC: number): number {
  if (ambientC <= DERATING_TABLE[0][0]) return 1;
  for (let i = 1; i < DERATING_TABLE.length; i++) {
    const [t0, k0] = DERATING_TABLE[i - 1];
    const [t1, k1] = DERATING_TABLE[i];
    if (ambientC <= t1) return Number((k0 + ((k1 - k0) * (ambientC - t0)) / (t1 - t0)).toFixed(4));
  }
  // за таблицей продолжаем последним наклоном, но не ниже 0,6 — дальше только расчёт завода
  const [tl, kl] = DERATING_TABLE[DERATING_TABLE.length - 1];
  const [tp, kp] = DERATING_TABLE[DERATING_TABLE.length - 2];
  const slope = (kl - kp) / (tl - tp);
  return Math.max(0.6, Number((kl + slope * (ambientC - tl)).toFixed(4)));
}

/**
 * Остальные поправочные коэффициенты раздела 7.2: I_required = I_load / (k_t · k_m · k_g · k_h).
 * Значения стартовые из ТЗ, помечены как требующие подтверждения инженерной службой КЛМ.
 * ponytail: таблицы плоские — заменяются справочником derating_curves (раздел 10.1) без правки формулы.
 */
export const MOUNT_FACTOR = { edge: 1, flat: 0.9 } as const;
export type MountWay = keyof typeof MOUNT_FACTOR;
export const MOUNT_LABEL: Record<MountWay, string> = {
  edge: "На ребро (шины вертикально)",
  flat: "Плашмя (шины горизонтально)",
};

/** Группировка параллельных трасс: сколько трасс идёт рядом */
export const GROUP_FACTOR: Record<number, number> = { 1: 1, 2: 0.95, 3: 0.9 };
/** Высота над уровнем моря, от которой вводится поправка */
export const ALTITUDE_THRESHOLD_M = 2000;
export const ALTITUDE_FACTOR = 0.95;

export const groupFactor = (n: number) => GROUP_FACTOR[Math.min(3, Math.max(1, Math.round(n)))];
export const altitudeFactor = (m: number) => (m > ALTITUDE_THRESHOLD_M ? ALTITUDE_FACTOR : 1);

/** Запас по току, ниже которого трасса считается натянутой (ТЗ 7.12: норма 15–35 %) */
export const RESERVE_MIN_PCT = 15;

/** Длина трассы, от которой ΔU перестаёт быть формальностью и решает выбор номинала */
export const DROP_CHECK_LEN_M = 50;
const routeLenNeedsDropCheck = (m: number) => m >= DROP_CHECK_LEN_M;

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
  /**
   * Ток нагрузки. По мощности: I = P·Kс / (√3·U·cosφ).
   * В режиме ввода тока Kс НЕ применяется второй раз — пользователь вводит уже
   * расчётный ток проекта, в котором одновременность учтена.
   */
  const loadA =
    input.mode === "current"
      ? input.currentA
      : (input.powerKW * 1000 * input.demand) / (Math.sqrt(3) * u * input.cosPhi);

  const trace: TraceStep[] = [
    input.mode === "current"
      ? {
          what: "Расчётный ток нагрузки",
          result: `${round(loadA)} А`,
          norm: "задан проектом; коэффициент одновременности в нём уже учтён",
        }
      : {
          what: "Расчётный ток нагрузки",
          formula: "I_load = P · 1000 · K_с / (√3 · U · cos φ)",
          substitution: `${input.powerKW} · 1000 · ${input.demand} / (1,732 · ${u} · ${input.cosPhi})`,
          result: `${round(loadA)} А`,
        },
  ];

  const kt = derating(input.ambientC);
  const km = MOUNT_FACTOR[input.mountWay];
  const kg = groupFactor(input.parallelRuns);
  const kh = altitudeFactor(input.altitudeM);
  const k = Number((kt * km * kg * kh).toFixed(4));
  const requiredA = loadA / k;
  const ratedA = nextRated(s.currents, requiredA);

  trace.push({
    what: "Поправка на условия прокладки",
    formula: "k = k_t · k_m · k_g · k_h",
    substitution: `${kt} · ${km} · ${kg} · ${kh}`,
    result: String(k),
    norm: `k_t от 35 °C по ГОСТ Р МЭК 61439-1 (задано ${input.ambientC} °C); k_m ${MOUNT_LABEL[input.mountWay].toLowerCase()}; k_g ${input.parallelRuns} трасс рядом; k_h ${input.altitudeM} м`,
  });
  trace.push({
    what: "Требуемый допустимый ток",
    formula: "I_required = I_load / k",
    substitution: `${round(loadA)} / ${k}`,
    result: `${round(requiredA)} А`,
  });
  trace.push({
    what: `Номинал из ряда ${s.name}`,
    formula: "I_rated = min{ I ∈ ряд : I ≥ I_required }",
    substitution: s.currents.map((c) => (c === ratedA ? `[${c}]` : String(c))).join(" · "),
    result: ratedA != null ? `${ratedA} А` : "ряда не хватает",
  });
  if (ratedA != null)
    trace.push({
      what: "Запас по току",
      formula: "reserve = (I_rated − I_load) / I_load · 100",
      substitution: `(${ratedA} − ${round(loadA)}) / ${round(loadA)} · 100`,
      result: `${round(((ratedA - loadA) / loadA) * 100)} %`,
      norm: `проектная норма ${RESERVE_MIN_PCT}–35 %`,
    });

  if (input.ambientC > AMBIENT_MAX_C)
    checks.push({
      level: "warn",
      text: `Таблица поправок доведена до ${AMBIENT_MAX_C} °C, задано ${input.ambientC} °C`,
      fix: "коэффициент экстраполирован — подтвердить допустимый ток в КЛМ",
    });

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
      // совет по IP68 относится только к низковольтным сериям: ТПЛ — это 6–35 кВ, ШМА его не заменит
      fix: s.duty === "mv"
        ? "ТПЛ выпускается в наружном исполнении — согласовать степень защиты по опроснику КЛМ"
        : "литой магистральный шинопровод IP68",
    });

  // --- огнестойкость ---
  if (input.fireE > 0 && s.duty !== "main")
    checks.push({
      level: "warn",
      text: `Огнестойкость E${input.fireE} подтверждена для магистрального ШМА`,
      fix: "огнестойкий участок трассы выполнить на KLM-S",
    });

  // --- отводы ---
  // предел на одно окно — из справочника серии, а не из общей константы
  const windowMax = s.tapMaxA ?? TAP_WINDOW_MAX;
  const tapBoxes = input.taps.map((requestedA) => ({
    requestedA,
    boxA: nextRated(TAP_BOXES, requestedA),
    viaSection: requestedA > windowMax,
  }));

  if (input.taps.length > 0 && s.tapMaxA == null)
    checks.push({
      level: "error",
      text: `${s.name} не имеет окон отбора по длине`,
      fix: "распределение выполнить на KLM-R, магистраль оставить на KLM-S",
    });

  if (s.tapMaxA != null) {
    const compat = s.tapBoxCompatA;
    if (compat != null && ratedA != null && input.taps.length > 0 && ratedA < compat[0])
      checks.push({
        level: "error",
        text: `КОМ встают на ${s.name} ${compat[0]}–${compat[1]} А, подобрано ${ratedA} А`,
        fix: `поднять номинал трассы до ${compat[0]} А или снять нагрузку кабелем от щита`,
      });

    for (const t of tapBoxes) {
      if (t.boxA == null)
        checks.push({ level: "error", text: `Отвод ${t.requestedA} А выше ряда КОМ (максимум ${TAP_BOXES.at(-1)} А)` });
      else if (t.viaSection)
        checks.push({
          level: "warn",
          text: `Отвод ${t.requestedA} А больше ${windowMax} А на окно`,
          fix: `КОМ ${t.boxA} А ставится на секцию отбора, не в стандартное окно`,
        });
    }
    const tapSum = input.taps.reduce((a, b) => a + b, 0);
    if (ratedA != null && tapSum > ratedA)
      checks.push({
        level: "error",
        text: `Сумма отводов ${tapSum} А превышает номинал магистрали ${ratedA} А (коэффициент одновременности принят 1,0)`,
        fix: "поднять номинал трассы, разнести нагрузку на две трассы или подтвердить Kс отводов в КЛМ",
      });

    /**
     * Окна отбора. Шаг — опция заказа (0,5 или 1,0 м), поэтому считаем по обоим:
     * не помещается при 1,0 м, но помещается при 0,5 м — это не ошибка, а требование
     * к шагу, которое надо вынести в спецификацию.
     */
    const pitchWide = Math.max(...s.tapPitchM);
    const pitchDense = Math.min(...s.tapPitchM);
    const windowsAt = (p: number) => Math.floor(input.routeLenM / p);
    if (input.taps.length > windowsAt(pitchDense))
      checks.push({
        level: "error",
        text: `${input.taps.length} отводов не помещается на ${input.routeLenM} м даже при шаге ${pitchDense} м (${windowsAt(pitchDense)} окон)`,
        fix: "удлинить трассу или разнести отводы на две ветки",
      });
    else if (input.taps.length > windowsAt(pitchWide))
      checks.push({
        level: "info",
        text: `${input.taps.length} отводов на ${input.routeLenM} м требуют шага окон ${pitchDense} м (при ${pitchWide} м — ${windowsAt(pitchWide)} окон)`,
        fix: `указать в спецификации шаг ответвлений ${pitchDense} м`,
      });
  }

  // --- запас по току ---
  const reservePct = ratedA != null ? round(((ratedA - loadA) / loadA) * 100) : 0;
  if (ratedA != null && reservePct < RESERVE_MIN_PCT)
    checks.push({
      level: "warn",
      text: `Запас по току ${reservePct} % — ниже проектной нормы ${RESERVE_MIN_PCT}–35 %`,
      fix: `взять следующий номинал ряда, если рост нагрузки на объекте возможен`,
    });

  /**
   * Потеря напряжения. ΔU = √3·I·L·(R·cosφ + X·sinφ), предел 5 % по ПУЭ 1.2.21;
   * при нагрузке, распределённой по длине, для конца трассы ΔU допустимо делить на 2.
   * Считать нечем: R и X (Ом/км) по номиналам КЛМ не переданы (ТЗ, открытый вопрос 3).
   * Молча пропустить проверку нельзя — на длинной трассе она и решает выбор номинала.
   */
  if (routeLenNeedsDropCheck(input.routeLenM))
    checks.push({
      level: "info",
      text: `Трасса ${input.routeLenM} м — потерю напряжения нужно проверить отдельно (предел 5 % по ПУЭ 1.2.21)`,
      fix: "в справочнике КЛМ нет R и X по номиналам — расчёт ΔU подключается вместе с ними",
    });

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
    reservePct,
    derating: k,
    deratingParts: { kt, km, kg, kh },
    sections,
    tapBoxes,
    checks,
    trace,
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
    name: "Кран-балка 200 А",
    input: { ...DEFAULT_INPUT, duty: "mobile", mode: "current", currentA: 200, env: "dusty", routeLenM: 40, taps: [] },
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
