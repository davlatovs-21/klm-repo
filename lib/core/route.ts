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
import {
  COMPENSATOR_MAX_RUN_M,
  CORNER_HORIZONTAL_MM,
  FIRE_BARRIER,
  SECTION_STANDARD_MM,
  TAP_BOXES_S,
  TAP_WINDOW_MAX_S,
  cornerVerticalMm,
  nonStandardCode,
} from "./klm-catalog";
import { massPerM, profileFor } from "./klm-profile";

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
 * Значения по умолчанию.
 * Длины секций — из каталога V3 (стр. 8): стандарт 3000 мм, нестандарт от 500 мм.
 * Шаг подвесов и расчётный перепад температуры каталогом не заданы и остаются
 * ориентирами ТЗ; масса берётся из каталога по номиналу, а это значение —
 * запасное на случай трассы без заданного номинала.
 */
export const DEFAULT_LAYOUT: LayoutParams = {
  sectionMinMm: 500,
  sectionMaxMm: SECTION_STANDARD_MM,
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
  /** Масса трассы, кг — погонная масса каталога V3 × длину */
  massKg: number;
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
 * Разбиение длины на секции: жадно от стандартной 3000 мм, чтобы стыков было
 * меньше (ТЗ 8.3.1).
 *
 * Каталог V3 (стр. 5 и 8) знает ровно одну стандартную длину — 3000 мм.
 * Любой остаток — это нестандартная секция FE-S с кодом S1 (500–999 мм),
 * S2 (1000–1999) или S3 (2000–2999): изготовление под заказ, срок больше.
 * Короче 500 мм завод секцию не делает вовсе — это уже ошибка раскладки.
 *
 * Раньше «нестандартным» считался только остаток короче минимальной длины,
 * и секция 1500 мм молча проходила как стандартная, хотя таковой не является.
 */
export function splitIntoSections(lengthMm: number, minMm: number, maxMm: number) {
  const full = Math.floor(lengthMm / maxMm);
  const remainderMm = lengthMm - full * maxMm;
  if (remainderMm === 0) return { full, remainderMm: 0, nonStandard: false, tooShort: false };
  return { full, remainderMm, nonStandard: true, tooShort: remainderMm < minMm };
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
      totalLengthM: 0, horizontalLengthM: 0, verticalLengthM: 0, massKg: 0,
      elements: [], totalItems: 0, checks, trace,
    };
  }

  /**
   * Углы съедают длину прямых участков, и теперь это считается.
   * Габариты плеч — каталог V3, стр. 9 и 10: горизонтальный угол CD одинаков
   * на всём ряду (435 мм по каждому плечу), вертикальный CP растёт с номиналом.
   * До каталога этих чисел не было, и раздел выдавал предупреждение
   * «длина углов не вычтена из прямых участков» вместо числа.
   */
  const fallbackRatedA = Math.max(0, ...route.segments.map((s) => s.ratedA ?? 0)) || 1600;
  // развороты сюда не попадают: они отсеиваются как ошибка ввода, а не элемент
  const cornerList: { turn: Exclude<NonNullable<Turn>, { kind: "reversal" }> }[] = [];
  const deductMm = new Array<number>(route.segments.length).fill(0);

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
    cornerList.push({ turn: t });
    const ratedA = route.segments[i].ratedA ?? route.segments[i - 1].ratedA ?? fallbackRatedA;
    const arm =
      t.kind === "horizontal" ? CORNER_HORIZONTAL_MM : cornerVerticalMm(route.material, ratedA);
    // плечо угла уходит и в предыдущий участок, и в следующий
    deductMm[i - 1] += arm;
    deductMm[i] += arm;
  }

  /* прямые секции и стыки */
  let sectionCount = 0;
  let nonStandardCount = 0;
  let cornerAllowanceMm = 0;
  for (const [i, s] of route.segments.entries()) {
    if (s.lengthMm <= 0) {
      checks.push({ level: "error", text: `Участок с нулевой или отрицательной длиной`, fix: "задайте длину больше нуля" });
      continue;
    }
    const straightMm = s.lengthMm - deductMm[i];
    if (straightMm <= 0) {
      checks.push({
        level: "error",
        text: `Участок ${i + 1} длиной ${s.lengthMm} мм короче углов на его концах (${deductMm[i]} мм)`,
        fix: "удлините участок, уберите излом или согласуйте нестандартный угол с КЛМ",
      });
      continue;
    }
    cornerAllowanceMm += deductMm[i];
    const split = splitIntoSections(straightMm, params.sectionMinMm, params.sectionMaxMm);
    if (split.full > 0) add(elements, "Прямая секция", split.full, `${params.sectionMaxMm} мм`);
    if (split.remainderMm > 0) {
      if (split.tooShort) {
        checks.push({
          level: "error",
          text: `Остаток участка ${i + 1} — ${split.remainderMm} мм, короче минимальной секции ${params.sectionMinMm} мм`,
          fix: "подогнать длину участка: завод не изготавливает секции короче 500 мм",
        });
      } else {
        const code = nonStandardCode(split.remainderMm);
        add(elements, "Прямая секция нестандартной длины", 1, `${split.remainderMm} мм${code ? ` (${code})` : ""}`);
        nonStandardCount++;
      }
    }
    sectionCount += split.full + (split.remainderMm > 0 ? 1 : 0);
  }

  trace.push({
    what: "Разбиение на секции",
    formula: "из длины участка вычитаются плечи углов, остаток жадно режется от максимальной длины",
    substitution: `${totalLengthM} м − ${cornerAllowanceMm} мм на углы, секция ${params.sectionMinMm}–${params.sectionMaxMm} мм`,
    result: `${sectionCount} секций${nonStandardCount ? `, из них ${nonStandardCount} нестандартных` : ""}`,
    norm: "ТЗ 8.3.1; габариты углов — каталог KLM V3, стр. 9–10",
  });

  if (nonStandardCount > 0)
    checks.push({
      level: "warn",
      text: `${nonStandardCount} секц. нестандартной длины — изготовление под заказ, срок больше`,
      fix: "подогнать длины участков под кратность стандартной секции",
    });

  /* углы на изломах — состав элементов; длина уже вычтена выше */
  const corners = cornerList.length;
  for (const { turn } of cornerList) {
    if (turn.kind === "horizontal") add(elements, "Угол горизонтальный", 1, turn.side);
    else add(elements, "Угол вертикальный", 1, turn.side);
  }

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
    const box = TAP_BOXES_S.find((b) => b >= t.currentA);
    if (box == null) {
      checks.push({
        level: "error",
        text: `Отвод ${t.currentA} А выше ряда КОМ (максимум ${TAP_BOXES_S[TAP_BOXES_S.length - 1]} А)`,
        fix: "разнести нагрузку на два отвода или запитать кабелем от щита",
      });
      continue;
    }
    add(elements, "Коробка отбора (КОМ)", 1, `${box} А`);
    /**
     * Свыше 630 А с одного окна не снять (каталог V3, стр. 8), поэтому такой
     * отвод идёт коробкой Bolt-on на стык секций, а не Plug-in в окно.
     */
    if (t.currentA > TAP_WINDOW_MAX_S) add(elements, "Секция отбора", 1, `под КОМ ${box} А`);
  }

  /**
   * Ряд коробок KLM-S начинается со 160 А (каталог V3, стр. 24). Отвод меньше
   * этого всё равно обслуживается коробкой 160 А — инженер должен это видеть,
   * иначе в спецификации возникает необъяснимый скачок номинала.
   */
  const smallTaps = route.taps.filter((t) => t.currentA > 0 && t.currentA < TAP_BOXES_S[0]).length;
  if (smallTaps > 0)
    checks.push({
      level: "info",
      text: `${smallTaps} отв. слабее ${TAP_BOXES_S[0]} А — минимальной коробки KLM-S`,
      fix: `ставится КОМ ${TAP_BOXES_S[0]} А; мелкие отводы дешевле собрать в один щиток`,
    });

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
    if (kind === "fire") add(elements, "Противопожарная проходка", n, `FB, ${FIRE_BARRIER.ratingMin} мин`);
    else if (kind === "wall") add(elements, "Проходка через стену или перекрытие", n);
    else add(elements, "Дилатационная вставка", n);
  }

  /**
   * Комплект огнестойкой проходки — не единственная позиция на пересечении.
   * Каталог V3, стр. 23: производитель требует отдельно включать в спецификацию
   * материалы заделки швов, и без них комплект не даёт заявленных 180 минут.
   */
  const fireCrossings = route.crossings.filter((c) => c.kind === "fire").length;
  if (fireCrossings > 0)
    checks.push({
      level: "warn",
      text: `К ${fireCrossings} огнестойк. проходкам нужны материалы заделки швов`,
      fix: `${FIRE_BARRIER.extras.join(", ").toLowerCase()}; стена или перекрытие от ${FIRE_BARRIER.minWallMm} мм, ${FIRE_BARRIER.norm}`,
    });

  /**
   * Компенсаторы теплового расширения.
   *
   * Считаются по заводской норме, а не по допуску стыка: каталог V3, стр. 21 —
   * компенсационная секция CML ставится на прямых участках не реже чем через
   * 30 м для алюминиевого проводника и 45 м для медного. Норма перекрывает
   * прежний расчёт из ТЗ 7.7, где предельная длина выводилась из ΔL и допуска
   * стыка: у завода есть своя проверенная цифра, и она главнее нашей оценки.
   *
   * Расчёт удлинения остаётся в трассировке — инженеру нужно видеть, сколько
   * миллиметров набегает, даже когда число секций определяет норма.
   */
  const expansionJoints = route.crossings.filter((c) => c.kind === "expansion").length;
  const runLimitM = COMPENSATOR_MAX_RUN_M[route.material];
  // по каждому прямому участку отдельно: норма про прямой участок, а не про всю трассу
  const compensators = route.segments.reduce(
    (sum, s) => sum + Math.max(0, Math.ceil(s.lengthMm / 1000 / runLimitM) - 1),
    0,
  );
  if (compensators > 0) add(elements, "Компенсатор", compensators, `CML, шаг ${runLimitM} м`);

  const exp = thermalExpansion({
    material: route.material,
    lengthM: totalLengthM,
    deltaTC: params.deltaTC,
    jointToleranceMm: params.jointToleranceMm,
    buildingJoints: expansionJoints,
  });
  trace.push(...exp.trace);
  trace.push({
    what: "Компенсационные секции",
    formula: "по каждому прямому участку: ceil(L / L_доп) − 1",
    substitution: route.segments.map((s) => `${(s.lengthMm / 1000).toFixed(1)} м`).join(" + ") + ` при L_доп = ${runLimitM} м`,
    result: `${compensators} шт`,
    norm: `каталог KLM V3, стр. 21: ${route.material === "Al" ? "алюминий — не более 30 м" : "медь — не более 45 м"} прямого участка`,
  });

  /**
   * Погонная масса — из каталога V3 (стр. 7) по материалу и номиналу трассы,
   * а не из ориентира ТЗ. От неё зависит и нагрузка на подвес, и масса трассы
   * в спецификации. Запасное значение params.weightPerMKg остаётся для трасс,
   * где номинал ещё не задан.
   */
  const profile = profileFor(route.material, fallbackRatedA);
  const weightPerMKg = profile != null ? massPerM(profile, 55, 4) : params.weightPerMKg;
  const massKg = Number((weightPerMKg * totalLengthM).toFixed(1));

  trace.push({
    what: "Масса трассы",
    formula: "m = m_пог · L",
    substitution: `${weightPerMKg} кг/м · ${totalLengthM} м`,
    result: `${massKg} кг`,
    norm:
      profile != null
        ? `каталог KLM V3, стр. 7: ${route.material} ${fallbackRatedA} А, 4P IP55`
        : "номинал не задан — взята ориентировочная масса ТЗ",
  });

  /* подвесы: горизонталь и вертикаль считаются своим шагом */
  const heavyPoints = corners + route.branches + reductions;
  const hangHoriz = hangers({
    lengthM: horizontalMm / 1000,
    pitchM: params.hangerPitchHorizontalM,
    heavyPoints,
    weightPerMKg,
  });
  const hangVert =
    verticalMm > 0
      ? hangers({
          lengthM: verticalMm / 1000,
          pitchM: params.hangerPitchVerticalM,
          weightPerMKg,
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
    text: "Спецификация без артикулов и цен: номенклатура и прайс КЛМ не переданы",
    fix: "ячейки опросного листа 01-nomenklatura.csv и 05-prays.csv; габариты и массы уже взяты из каталога V3",
  });

  const list = [...elements.values()].sort((a, b) => a.class.localeCompare(b.class, "ru"));
  return {
    totalLengthM,
    horizontalLengthM: Number((horizontalMm / 1000).toFixed(2)),
    verticalLengthM: Number((verticalMm / 1000).toFixed(2)),
    massKg,
    elements: list,
    totalItems: list.reduce((a, e) => a + e.count, 0),
    checks,
    trace,
  };
}

/** Позиции отводов для расчёта падения напряжения по моменту нагрузки */
export const tapsForDrop = (route: Route) =>
  route.taps.map((t) => ({ currentA: t.currentA, positionM: t.positionM }));

/* ── план трассы для схемы ────────────────────────────────────────
   Канва рисует вид сверху. Вертикальные участки в плане не смещают
   трассу, но занимают расстояние вдоль неё — отсюда отдельное поле atMm. */

export type PlanPoint = { xMm: number; yMm: number };
/** Узел плана: точка на виде сверху и расстояние от начала трассы */
export type PlanNode = PlanPoint & { atMm: number; verticalMm: number };

const STEP: Record<Direction, [number, number]> = {
  "x+": [1, 0], "x-": [-1, 0], "y+": [0, 1], "y-": [0, -1], up: [0, 0], down: [0, 0],
};

/**
 * Ломаная трассы в плане. Узлов на один больше, чем участков:
 * начало плюс конец каждого участка.
 */
export function planNodes(segments: Segment[]): PlanNode[] {
  const nodes: PlanNode[] = [{ xMm: 0, yMm: 0, atMm: 0, verticalMm: 0 }];
  let x = 0, y = 0, at = 0;

  for (const s of segments) {
    const [dx, dy] = STEP[s.direction];
    const len = Math.max(0, s.lengthMm);
    x += dx * len;
    y += dy * len;
    at += len;
    const vertical = isVertical(s.direction) ? (s.direction === "up" ? len : -len) : 0;
    nodes.push({ xMm: x, yMm: y, atMm: at, verticalMm: vertical });
  }
  return nodes;
}

/** Габариты плана — для подгонки области просмотра */
export function planBounds(nodes: PlanNode[]) {
  const xs = nodes.map((n) => n.xMm);
  const ys = nodes.map((n) => n.yMm);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  };
}

/**
 * Точка в плане на заданном расстоянии вдоль трассы.
 * Внутри вертикального участка план не меняется — возвращается его узел.
 */
export function pointAtDistance(segments: Segment[], distMm: number): PlanPoint {
  const nodes = planNodes(segments);
  const total = nodes[nodes.length - 1]?.atMm ?? 0;
  const d = Math.min(Math.max(0, distMm), total);

  for (let i = 0; i < segments.length; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    if (d > to.atMm) continue;
    if (isVertical(segments[i].direction)) return { xMm: from.xMm, yMm: from.yMm };
    const span = to.atMm - from.atMm;
    const k = span === 0 ? 0 : (d - from.atMm) / span;
    return { xMm: from.xMm + (to.xMm - from.xMm) * k, yMm: from.yMm + (to.yMm - from.yMm) * k };
  }
  const last = nodes[nodes.length - 1];
  return { xMm: last.xMm, yMm: last.yMm };
}

/**
 * Обратная задача для перетаскивания: ближайшая точка трассы к произвольной
 * точке плана и расстояние до неё вдоль трассы. Вертикальные участки
 * пропускаются — в плане они вырождаются в точку.
 */
export function distanceAtPoint(segments: Segment[], xMm: number, yMm: number): number {
  const nodes = planNodes(segments);
  let best = 0;
  let bestDist = Infinity;

  for (let i = 0; i < segments.length; i++) {
    if (isVertical(segments[i].direction)) continue;
    const from = nodes[i];
    const to = nodes[i + 1];
    const vx = to.xMm - from.xMm;
    const vy = to.yMm - from.yMm;
    const len2 = vx * vx + vy * vy;
    if (len2 === 0) continue;

    // проекция точки на отрезок, зажатая его концами
    const k = Math.min(1, Math.max(0, ((xMm - from.xMm) * vx + (yMm - from.yMm) * vy) / len2));
    const px = from.xMm + vx * k;
    const py = from.yMm + vy * k;
    const d2 = (xMm - px) ** 2 + (yMm - py) ** 2;
    if (d2 < bestDist) {
      bestDist = d2;
      best = from.atMm + Math.sqrt(len2) * k;
    }
  }
  return best;
}

/** Привязка к сетке окон отбора: шаг 0,5 м (ТЗ M3.2) */
export const SNAP_M = 0.5;
export const snapToGrid = (positionM: number, step = SNAP_M) =>
  Number((Math.round(positionM / step) * step).toFixed(2));

/**
 * Разложение хода до точки в ортогональные участки — рисование трассы кликами.
 * Сначала по оси с большим смещением, чтобы ломаная выглядела естественно.
 * Отрезки короче шага сетки отбрасываются: клик рядом с концом трассы
 * не должен плодить мусорные участки.
 */
export function segmentsToPoint(
  fromX: number, fromY: number, toX: number, toY: number,
  minMm = SNAP_M * 1000,
): { direction: Direction; lengthMm: number }[] {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const alongX = { direction: (dx >= 0 ? "x+" : "x-") as Direction, lengthMm: Math.abs(dx) };
  const alongY = { direction: (dy >= 0 ? "y+" : "y-") as Direction, lengthMm: Math.abs(dy) };
  const order = Math.abs(dx) >= Math.abs(dy) ? [alongX, alongY] : [alongY, alongX];
  return order.filter((s) => s.lengthMm >= minMm);
}
