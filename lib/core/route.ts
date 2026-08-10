/**
 * Модель трассы и разбор её геометрии — модуль M3 ТЗ, разделы 8.2 и 8.3.
 *
 * Вход: последовательность сегментов, точки отбора, точка питания, пересечения.
 * Выход: перечень элементов по классам, проверки и трассировка.
 *
 * Чего здесь НЕТ и почему:
 *   — артикулов, весов и цен: номенклатура КЛМ не передана (data/etap-0/01);
 *   — вычета длины углов из прямых участков: габариты углов не переданы (data/etap-0/04).
 *     Это отдельный класс ошибок по ТЗ 8.3, и молча считать без него нельзя —
 *     поэтому выводится предупреждение, а не тихий неверный итог.
 *
 * Функции чистые: ни базы, ни часов, ни интерфейса.
 */
import { thermalExpansion, hangers, type Material, type TraceStep } from "./electrical";
import { TAP_BOXES, TAP_WINDOW_MAX } from "./klm-catalog";

/* ── модель ───────────────────────────────────────────────────────── */

/** Направление участка. Горизонталь — по осям плана, вертикаль — по высоте. */
export type Direction = "x+" | "x-" | "y+" | "y-" | "up" | "down";

export const DIRECTION_LABEL: Record<Direction, string> = {
  "x+": "Восток", "x-": "Запад", "y+": "Север", "y-": "Юг", up: "Вверх", down: "Вниз",
};

export const isVertical = (d: Direction) => d === "up" || d === "down";

export type Segment = {
  id: string;
  direction: Direction;
  lengthMm: number;
  /** Номинал на этом участке, А. Смена номинала между участками даёт редукцию */
  ratedA?: number;
  note?: string;
};

/** Точка отбора мощности вдоль трассы */
export type TapPoint = {
  id: string;
  /** Расстояние от начала трассы, м */
  positionM: number;
  currentA: number;
  purpose?: string;
  handle?: boolean;
};

/** Пересечение границы: огнестойкий отсек, стена, деформационный шов */
export type CrossingKind = "fire" | "wall" | "expansion";
export type Crossing = { id: string; positionM: number; kind: CrossingKind };

export const CROSSING_LABEL: Record<CrossingKind, string> = {
  fire: "Противопожарная проходка",
  wall: "Проходка через стену или перекрытие",
  expansion: "Дилатационная вставка",
};

/** Откуда питается трасса — влияет на падение напряжения и на вводные секции */
export type FeedPoint = "start" | "center" | "both";

export const FEED_LABEL: Record<FeedPoint, string> = {
  start: "С конца трассы",
  center: "Из центра",
  both: "С двух сторон (2N)",
};

export type Route = {
  segments: Segment[];
  taps: TapPoint[];
  crossings: Crossing[];
  feed: FeedPoint;
  material: Material;
  /** Ответвлений от магистрали (тройников), заданных пользователем */
  branches: number;
};

/** Параметры раскладки из справочника завода. Пока не переданы — отсюда и оговорки. */
export type LayoutParams = {
  /** Стандартные длины прямых секций, мм. На сайте опубликован только диапазон */
  sectionMinMm: number;
  sectionMaxMm: number;
  /** Допуск стыка, мм — от него считается число компенсаторов (ТЗ 7.7) */
  jointToleranceMm: number;
  /** Расчётный перепад температуры шин, °C */
  deltaTC: number;
  /** Шаг подвесов по горизонтали и вертикали, м (ТЗ 7.8) */
  hangerPitchHorizontalM: number;
  hangerPitchVerticalM: number;
  /** Масса погонного метра, кг — для нагрузки на подвес */
  weightPerMKg: number;
};

/**
 * Значения по умолчанию — ориентиры из ТЗ, а не данные КЛМ.
 * Каждое помечено в интерфейсе как неподтверждённое.
 */
export const DEFAULT_LAYOUT: LayoutParams = {
  sectionMinMm: 1000,
  sectionMaxMm: 3000,
  jointToleranceMm: 15,
  deltaTC: 40,
  hangerPitchHorizontalM: 2.5,
  hangerPitchVerticalM: 3,
  weightPerMKg: 18,
};

/* ── элементы спецификации ────────────────────────────────────────── */

/** Классы раздела 8.2. Здесь только те, что выводятся из геометрии. */
export type ElementClass =
  | "Прямая секция"
  | "Прямая секция нестандартной длины"
  | "Угол горизонтальный"
  | "Угол вертикальный"
  | "Тройник"
  | "Редукция"
  | "Вводная секция"
  | "Торцевая заглушка"
  | "Секция отбора"
  | "Коробка отбора (КОМ)"
  | "Компенсатор"
  | "Дилатационная вставка"
  | "Противопожарная проходка"
  | "Проходка через стену или перекрытие"
  | "Подвес / кронштейн"
  | "Комплект соединительный";

export type RouteElement = {
  class: ElementClass;
  count: number;
  /** Уточнение: сторона поворота, номинал коробки, длина нестандартной секции */
  detail?: string;
};

export type RouteCheck = { level: "error" | "warn" | "info"; text: string; fix?: string };

export type RouteResult = {
  totalLengthM: number;
  horizontalLengthM: number;
  verticalLengthM: number;
  elements: RouteElement[];
  /** Суммарное число позиций — для сравнения с эталонной спецификацией */
  totalItems: number;
  checks: RouteCheck[];
  trace: TraceStep[];
};

/* ── геометрия ────────────────────────────────────────────────────── */

/** Единичный вектор направления в плане; для вертикали план не меняется */
const PLAN: Record<Direction, [number, number]> = {
  "x+": [1, 0], "x-": [-1, 0], "y+": [0, 1], "y-": [0, -1], up: [0, 0], down: [0, 0],
};

export type Turn =
  | { kind: "horizontal"; side: "левый" | "правый" }
  | { kind: "vertical"; side: "вверх" | "вниз" }
  | { kind: "reversal" }
  | null;

/**
 * Какой элемент нужен на стыке двух участков.
 * Разворот на 180° углом не закрывается — это ошибка ввода, а не элемент.
 */
export function turnBetween(a: Direction, b: Direction): Turn {
  if (a === b) return null;
  if (isVertical(b)) return { kind: "vertical", side: b === "up" ? "вверх" : "вниз" };
  if (isVertical(a)) return { kind: "vertical", side: a === "up" ? "вниз" : "вверх" };

  const [ax, ay] = PLAN[a];
  const [bx, by] = PLAN[b];
  const cross = ax * by - ay * bx;
  if (cross === 0) return { kind: "reversal" };
  return { kind: "horizontal", side: cross > 0 ? "левый" : "правый" };
}

/**
 * Разбиение длины на стандартные секции: жадно от максимальной, чтобы
 * стыков было меньше (ТЗ 8.3.1). Остаток короче минимальной длины —
 * секция под заказ, она удлиняет срок изготовления.
 */
export function splitIntoSections(lengthMm: number, minMm: number, maxMm: number) {
  const full = Math.floor(lengthMm / maxMm);
  const remainderMm = lengthMm - full * maxMm;
  if (remainderMm === 0) return { full, remainderMm: 0, nonStandard: false };
  return { full, remainderMm, nonStandard: remainderMm < minMm };
}

/* ── разбор трассы ────────────────────────────────────────────────── */

const add = (map: Map<string, RouteElement>, cls: ElementClass, count: number, detail?: string) => {
  const key = detail ? `${cls}|${detail}` : cls;
  const found = map.get(key);
  if (found) found.count += count;
  else map.set(key, { class: cls, count, detail });
};

export function analyzeRoute(route: Route, params: LayoutParams = DEFAULT_LAYOUT): RouteResult {
  const checks: RouteCheck[] = [];
  const trace: TraceStep[] = [];
  const elements = new Map<string, RouteElement>();

  const totalMm = route.segments.reduce((a, s) => a + s.lengthMm, 0);
  const totalLengthM = Number((totalMm / 1000).toFixed(2));
  const horizontalMm = route.segments.filter((s) => !isVertical(s.direction)).reduce((a, s) => a + s.lengthMm, 0);
  const verticalMm = totalMm - horizontalMm;

  if (route.segments.length === 0) {
    checks.push({ level: "error", text: "Трасса пустая — добавьте хотя бы один участок" });
    return {
      totalLengthM: 0, horizontalLengthM: 0, verticalLengthM: 0,
      elements: [], totalItems: 0, checks, trace,
    };
  }

  /* прямые секции и стыки */
  let sectionCount = 0;
  let nonStandardCount = 0;
  for (const s of route.segments) {
    if (s.lengthMm <= 0) {
      checks.push({ level: "error", text: `Участок с нулевой или отрицательной длиной`, fix: "задайте длину больше нуля" });
      continue;
    }
    const split = splitIntoSections(s.lengthMm, params.sectionMinMm, params.sectionMaxMm);
    if (split.full > 0) add(elements, "Прямая секция", split.full, `${params.sectionMaxMm} мм`);
    if (split.remainderMm > 0) {
      if (split.nonStandard) {
        add(elements, "Прямая секция нестандартной длины", 1, `${split.remainderMm} мм`);
        nonStandardCount++;
      } else {
        add(elements, "Прямая секция", 1, `${split.remainderMm} мм`);
      }
    }
    sectionCount += split.full + (split.remainderMm > 0 ? 1 : 0);
  }

  trace.push({
    what: "Разбиение на секции",
    formula: "жадно от максимальной длины, остаток короче минимальной — под заказ",
    substitution: `${totalLengthM} м при секции ${params.sectionMinMm}–${params.sectionMaxMm} мм`,
    result: `${sectionCount} секций${nonStandardCount ? `, из них ${nonStandardCount} нестандартных` : ""}`,
    norm: "ТЗ 8.3.1",
  });

  if (nonStandardCount > 0)
    checks.push({
      level: "warn",
      text: `${nonStandardCount} секц. нестандартной длины — изготовление под заказ, срок больше`,
      fix: "подогнать длины участков под кратность стандартной секции",
    });

  /* углы на изломах */
  let corners = 0;
  for (let i = 1; i < route.segments.length; i++) {
    const t = turnBetween(route.segments[i - 1].direction, route.segments[i].direction);
    if (!t) continue;
    if (t.kind === "reversal") {
      checks.push({
        level: "error",
        text: `Участок ${i + 1} идёт навстречу предыдущему — разворот на 180° углом не выполняется`,
        fix: "разбейте разворот на два поворота по 90°",
      });
      continue;
    }
    corners++;
    if (t.kind === "horizontal") add(elements, "Угол горизонтальный", 1, t.side);
    else add(elements, "Угол вертикальный", 1, t.side);
  }

  if (corners > 0)
    checks.push({
      level: "warn",
      text: `Углы занимают часть длины трассы, и она не вычтена из прямых участков`,
      fix: "нужны габариты углов по обеим сторонам — ячейки опросного листа 04-geometriya-raskladki.csv",
    });

  /* смена номинала по длине — редукция */
  let reductions = 0;
  for (let i = 1; i < route.segments.length; i++) {
    const prev = route.segments[i - 1].ratedA;
    const cur = route.segments[i].ratedA;
    if (prev != null && cur != null && prev !== cur) {
      reductions++;
      add(elements, "Редукция", 1, `${prev} → ${cur} А`);
    }
  }

  /* ввод, заглушки, тройники */
  const feedSections = route.feed === "both" ? 2 : 1;
  add(elements, "Вводная секция", feedSections, FEED_LABEL[route.feed]);
  // свободных концов два, из них занятые вводом закрывать заглушкой не нужно
  const freeEnds = Math.max(0, 2 - (route.feed === "both" ? 2 : route.feed === "start" ? 1 : 0));
  if (freeEnds > 0) add(elements, "Торцевая заглушка", freeEnds);
  if (route.branches > 0) {
    add(elements, "Тройник", route.branches);
    add(elements, "Торцевая заглушка", route.branches, "на конце ответвления");
  }

  /* отводы и коробки отбора */
  for (const t of route.taps) {
    if (t.positionM < 0 || t.positionM > totalLengthM) {
      checks.push({
        level: "error",
        text: `Отвод «${t.purpose ?? t.currentA + " А"}» на отметке ${t.positionM} м вне трассы длиной ${totalLengthM} м`,
        fix: "поправьте позицию или удлините трассу",
      });
      continue;
    }
    const box = TAP_BOXES.find((b) => b >= t.currentA);
    if (box == null) {
      checks.push({
        level: "error",
        text: `Отвод ${t.currentA} А выше ряда КОМ (максимум ${TAP_BOXES[TAP_BOXES.length - 1]} А)`,
      });
      continue;
    }
    add(elements, "Коробка отбора (КОМ)", 1, `${box} А`);
    if (t.currentA > TAP_WINDOW_MAX) add(elements, "Секция отбора", 1, `под КОМ ${box} А`);
  }

  const tapSum = route.taps.reduce((a, t) => a + t.currentA, 0);
  if (route.taps.length > 0)
    trace.push({
      what: "Отводы по трассе",
      substitution: route.taps.map((t) => `${t.currentA} А на ${t.positionM} м`).join(", "),
      result: `${route.taps.length} шт, суммарно ${tapSum} А`,
    });

  /* пересечения границ */
  for (const kind of ["fire", "wall", "expansion"] as CrossingKind[]) {
    const n = route.crossings.filter((c) => c.kind === kind).length;
    if (n === 0) continue;
    if (kind === "fire") add(elements, "Противопожарная проходка", n);
    else if (kind === "wall") add(elements, "Проходка через стену или перекрытие", n);
    else add(elements, "Дилатационная вставка", n);
  }

  /* компенсаторы теплового расширения */
  const expansionJoints = route.crossings.filter((c) => c.kind === "expansion").length;
  const exp = thermalExpansion({
    material: route.material,
    lengthM: totalLengthM,
    deltaTC: params.deltaTC,
    jointToleranceMm: params.jointToleranceMm,
    buildingJoints: expansionJoints,
  });
  if (exp.compensators > 0) add(elements, "Компенсатор", exp.compensators);
  trace.push(...exp.trace);

  /* подвесы: горизонталь и вертикаль считаются своим шагом */
  const heavyPoints = corners + route.branches + reductions;
  const hangHoriz = hangers({
    lengthM: horizontalMm / 1000,
    pitchM: params.hangerPitchHorizontalM,
    heavyPoints,
    weightPerMKg: params.weightPerMKg,
  });
  const hangVert =
    verticalMm > 0
      ? hangers({
          lengthM: verticalMm / 1000,
          pitchM: params.hangerPitchVerticalM,
          weightPerMKg: params.weightPerMKg,
        })
      : null;

  const hangerCount = hangHoriz.count + (hangVert?.count ?? 0);
  add(elements, "Подвес / кронштейн", hangerCount);
  trace.push(...hangHoriz.trace);

  /* комплекты соединения: на каждый стык между секциями и элементами */
  const jointed = sectionCount + corners + reductions + route.branches;
  const joints = Math.max(0, jointed - 1);
  add(elements, "Комплект соединительный", joints);
  trace.push({
    what: "Комплекты соединения",
    formula: "по числу стыков = (секции + углы + редукции + тройники) − 1",
    substitution: `(${sectionCount} + ${corners} + ${reductions} + ${route.branches}) − 1`,
    result: `${joints} шт`,
    norm: "ТЗ 8.3.3",
  });

  /* контроль полноты — ТЗ 8.3.4 */
  if (route.feed === "center" && route.segments.length === 1)
    checks.push({
      level: "info",
      text: "Питание из центра на одном участке: расчётная длина для падения напряжения делится пополам",
    });

  checks.push({
    level: "info",
    text: "Спецификация без артикулов, весов и цен: номенклатура КЛМ не передана",
    fix: "ячейки опросного листа 01-nomenklatura.csv и 05-prays.csv",
  });

  const list = [...elements.values()].sort((a, b) => a.class.localeCompare(b.class, "ru"));
  return {
    totalLengthM,
    horizontalLengthM: Number((horizontalMm / 1000).toFixed(2)),
    verticalLengthM: Number((verticalMm / 1000).toFixed(2)),
    elements: list,
    totalItems: list.reduce((a, e) => a + e.count, 0),
    checks,
    trace,
  };
}

/** Позиции отводов для расчёта падения напряжения по моменту нагрузки */
export const tapsForDrop = (route: Route) =>
  route.taps.map((t) => ({ currentA: t.currentA, positionM: t.positionM }));
