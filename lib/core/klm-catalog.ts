/**
 * РЕАЛЬНЫЙ СПРАВОЧНИК КЛМ.
 *
 * Два источника, и они не равны по весу:
 *   1. ОФИЦИАЛЬНЫЙ КАТАЛОГ «Шинопроводные системы KLM», редакция V3 от 24.03.2026.
 *      Старше по достоверности. Ряд номиналов, материалы, IP, габариты, массы,
 *      сопротивления, нормы компенсаторов и проходок берутся отсюда.
 *      Числовые таблицы вынесены в lib/core/klm-profile.ts.
 *   2. Публичный сайт заказчика, снимок 2026-08-05 (data/klm-source/).
 *      Остаётся источником по сериям KLM-T и ТПЛ, аналогам импорта и ссылкам
 *      на страницы каталога — в каталоге V3 этих разделов нет.
 *
 * Где источники расходятся, каталог побеждает, а расхождение помечено
 * комментарием CATALOG-V3 — молча затирать данные заказчика нельзя.
 */
import { RATED_SERIES } from "./klm-profile";

export const SITE = "https://xn--b1aekkfgciabim3h.xn--p1ai";
export const SNAPSHOT = "2026-08-05";
/** Редакция официального каталога, из которой взяты числовые данные KLM-S */
export const CATALOG = { edition: "V3", date: "2026-03-24" };

/** Ссылка на страницу источника; работает, пока сайт доступен */
export const src = (path: string) => SITE + path;

export type Duty = "main" | "distribution" | "mobile" | "mv";
export type BusMaterial = "Al" | "Cu";

export type BusbarSeries = {
  key: string;
  name: string;
  title: string;
  duty: Duty;
  /** Ряд номинальных токов, А — из страниц каталога */
  currents: number[];
  /** Номиналы, доступные только в меди (по таблицам «Материал шин») */
  copperOnly: number[];
  materials: BusMaterial[];
  /** Число проводников: 4 = 3L+PEN, 5 = 3L+N+PE */
  poles: number[];
  voltageV: number;
  ip: number[];
  /**
   * Диапазон номиналов серии, на которые встают коробки отбора мощности;
   * null — окон отбора нет, КОМ на эту серию не ставится.
   * Источник: строка «Совместимость» страниц /catalog/korobki-otvetvitelnye-tapp-off.
   */
  tapBoxCompatA: [number, number] | null;
  /** Максимальный ток отвода на одно окно, А; null — отборов по длине нет */
  tapMaxA: number | null;
  /** Шаг окон отбора, м */
  tapPitchM: number[];
  shortCircuitKA: number;
  sectionLenMm: [number, number];
  specs: Record<string, string>;
  source: string;
};

/* ── коробки отбора мощности KLM-S (CATALOG-V3 стр. 24) ─────────────
   Два исполнения, и они ставятся по-разному:
   Plug-in (PB) — в окно отбора секции Pi, до 630 А;
   Bolt-on (BB) — на стык двух секций, до 1250 А, требует стыковочный элемент GF.
   Монтаж Bolt-on выполняется только на обесточенной трассе. */
export const PLUG_IN_RANGE_A: [number, number] = [160, 630];
export const BOLT_ON_RANGE_A: [number, number] = [160, 1250];

/**
 * Шаг окон отбора секции Pi, м — ПРОЕКТНЫЙ ПАРАМЕТР, а не константа изделия.
 *
 * Заказчик 14.08.2026: шаг на каждом объекте свой, задавать значением по умолчанию.
 * Взято 0,5 м — шаг сетки привязки в конструкторе трассы (ТЗ M3.2) и плотный шаг
 * ответвлений ШРА. Значение переопределяется на объекте; от него зависит только
 * проверка «сколько отводов помещается на длине трассы», состав спецификации оно
 * не меняет.
 */
export const TAP_WINDOW_PITCH_DEFAULT_M = 0.5;

/** Длина стандартной прямой секции, мм (CATALOG-V3 стр. 8) */
export const SECTION_STANDARD_MM = 3000;

export const SERIES: BusbarSeries[] = [
  {
    key: "S",
    name: "KLM-S",
    title: "Магистральный ШМА · сэндвич",
    duty: "main",
    /** CATALOG-V3 стр. 5: ряд 160–6300 А. На сайте не было 315 и 500 А, зато стояло 10 000 А */
    currents: RATED_SERIES,
    /**
     * CATALOG-V3 стр. 6–7: и алюминий, и медь идут на всём ряду 160–6300 А.
     * На сайте значилось, что 160–2000 А выпускаются только в меди — каталог это опровергает.
     */
    copperOnly: [],
    materials: ["Cu", "Al"],
    poles: [4, 5],
    voltageV: 1000,
    /** CATALOG-V3 стр. 5: степень защиты кодируется только 55 и 68 */
    ip: [55, 68],
    /**
     * CATALOG-V3 стр. 24: на KLM-S ставятся коробки отбора мощности —
     * Plug-in в окна секции Pi и Bolt-on на стык двух секций.
     * Раньше здесь стоял null: считалось, что окон отбора у магистрали нет.
     */
    tapBoxCompatA: [BOLT_ON_RANGE_A[0], BOLT_ON_RANGE_A[1]],
    /** CATALOG-V3 стр. 8: максимальный ток с одного окна отбора — 630 А */
    tapMaxA: 630,
    /**
     * Шаг окон отбора. В каталоге V3 не опубликован; заказчик 14.08.2026 сказал,
     * что он всегда проектный, и просил взять значение по умолчанию — оно в
     * TAP_WINDOW_PITCH_DEFAULT_M. Второе значение ряда, 3 м, — шаг стыков секций:
     * это точки установки коробок Bolt-on (стр. 24), и оно выводится из длины секции.
     */
    tapPitchM: [TAP_WINDOW_PITCH_DEFAULT_M, SECTION_STANDARD_MM / 1000],
    shortCircuitKA: 150,
    /** CATALOG-V3 стр. 8: стандарт 3000 мм, нестандарт S1/S2/S3 от 500 мм */
    sectionLenMm: [500, 3000],
    specs: {
      "Номинальный ток": "160–6300 А",
      Напряжение: "до 1000 В AC",
      Частота: "50 / 60 Гц",
      "Материал шин": "Cu / Al — весь ряд",
      "Степень защиты": "IP55 / IP68",
      "Материал корпуса": "оцинкованная сталь / алюминиевый сплав / нержавеющая сталь",
      Изоляция: "ПЭТ-Э или Nomex®, плёнка от 250 мкм, 155 °C (по заказу до 700 °C)",
      "Стойкость к КЗ": "до 150 кА",
      "Длина секции": "3000 мм, нестандарт от 500 мм",
      "Отбор мощности": "Plug-in 160–630 А в окно, Bolt-on 160–1250 А на стык",
      "Срок службы": "не менее 35 лет",
    },
    source: "/catalog/shinoprovod-magistralnyy",
  },
  {
    /**
     * Ряд KLM-R — 160–630 А, подтверждено заказчиком 14.08.2026.
     * На сайте стояло 100–1600 А, это устаревшие данные. Значения 100, 800,
     * 1000 и 1600 А из ряда убраны; 315 и 500 А не добавлены — заказчик назвал
     * границы, а не полный ряд, и придумывать промежуточные номиналы нельзя.
     *
     * Отдельно: в каталоге V3 (стр. 25) под кодом KLM-R показан шинопровод
     * скрытой прокладки для рабочих мест на 63 А. Это другое изделие под той же
     * буквой; распределительный ШРА описан здесь.
     */
    key: "R",
    name: "KLM-R",
    title: "Распределительный ШРА · с окнами отбора",
    duty: "distribution",
    currents: [160, 250, 400, 630],
    copperOnly: [],
    materials: ["Cu", "Al"],
    poles: [4, 5],
    voltageV: 1000,
    ip: [54, 55],
    /**
     * Верхняя граница совместимости опущена с 1600 до 630 А вслед за рядом серии.
     * Нижняя оставлена сайтовой (250 А): заказчик поправил ряд, но не диапазон
     * совместимости коробок, а сам по себе номинал 160 А коробку не тянет.
     */
    tapBoxCompatA: [250, 630],
    tapMaxA: 250,
    tapPitchM: [0.5, 1],
    shortCircuitKA: 50,
    sectionLenMm: [1000, 3000],
    specs: {
      "Номинальный ток": "160–630 А",
      Напряжение: "до 1000 В AC",
      "Материал шин": "Cu / Al",
      "Степень защиты": "IP54 / IP55",
      "Ответвительные коробки": "16–250 А",
      "Шаг ответвлений": "0,5 / 1,0 м",
      "Срок службы": "не менее 35 лет",
    },
    source: "/catalog/shinoprovod-raspredelitelnyy",
  },
  {
    key: "T",
    name: "KLM-T",
    title: "Троллейный · подвижная нагрузка",
    duty: "mobile",
    currents: [100, 160, 250, 400, 630, 800],
    copperOnly: [],
    materials: ["Cu"],
    poles: [4, 5, 7],
    voltageV: 690,
    ip: [55, 65],
    tapBoxCompatA: null,
    tapMaxA: null,
    tapPitchM: [],
    shortCircuitKA: 25,
    sectionLenMm: [2000, 4000],
    specs: {
      "Номинальный ток": "100–800 А",
      "Степень защиты": "IP55 / IP65",
      "Скорость каретки": "до 250 м/мин",
      "Кол-во полюсов": "4 / 5 / 7",
      "Длина секции": "2 / 4 м",
      Температура: "−30…+55 °C",
    },
    source: "/catalog/klm-t",
  },
  {
    key: "TPL",
    name: "ТПЛ",
    title: "Токопровод с литой изоляцией · 6 / 10 / 35 кВ",
    duty: "mv",
    currents: [1000, 1600, 2000, 2500, 3200, 4000, 5000, 6300, 8000, 10000, 12500],
    copperOnly: [],
    materials: ["Cu", "Al"],
    poles: [3, 4],
    voltageV: 35000,
    ip: [54, 65],
    tapBoxCompatA: null,
    tapMaxA: null,
    tapPitchM: [],
    shortCircuitKA: 80,
    sectionLenMm: [1000, 3000],
    specs: {
      "Номинальное напряжение": "6 / 10 / 35 кВ",
      "Номинальный ток": "до 12 500 А",
      "Тип изоляции": "литая эпоксидная",
      "Стойкость к КЗ": "до 80 кА (3 с)",
      "Степень защиты": "IP54 / IP65",
      "Среда эксплуатации": "внутренняя / наружная",
      "Срок службы": "не менее 30 лет",
    },
    source: "/catalog/tokoprovod",
  },
];

export const seriesByDuty = (d: Duty) => SERIES.find((s) => s.duty === d)!;

/** Коробки отбора мощности (тапп-офф) — ряд со страниц /catalog/korobki-otvetvitelnye-tapp-off */
export const TAP_BOXES = [16, 32, 63, 125, 160, 250, 400, 630];

/**
 * Ряд коробок отбора для KLM-S. CATALOG-V3 стр. 24: номиналы коробок берутся
 * из ряда самого шинопровода, Plug-in до 630 А, Bolt-on до 1250 А.
 * Мелких 16–125 А, как у тапп-офф на ШРА, здесь нет: минимум 160 А.
 */
export const TAP_BOXES_S = RATED_SERIES.filter(
  (a) => a >= BOLT_ON_RANGE_A[0] && a <= BOLT_ON_RANGE_A[1],
);

/**
 * Предел на одно окно отбора у распределительного ШРА KLM-R, А.
 * Источник — страницы тапп-офф на сайте. Каталог V3 раздел ШРА не покрывает,
 * поэтому значение остаётся сайтовым.
 */
export const TAP_WINDOW_MAX = 250;

/**
 * Предел на одно окно отбора у магистрального KLM-S, А.
 * CATALOG-V3 стр. 8: «максимальный ток, который можно снять с одного окошка
 * отбора мощности — 630 А». Выше этого отвод идёт коробкой Bolt-on на стык
 * секций либо через секцию отбора.
 *
 * Разведено с TAP_WINDOW_MAX намеренно: это два разных изделия с разными
 * окнами, и общая константа на оба ряда врала бы в одну или другую сторону.
 */
export const TAP_WINDOW_MAX_S = 630;
/** Рабочее напряжение КОМ — ниже, чем у самого шинопровода (1000 В) */
export const TAP_BOX_VOLTAGE_V = 690;
/** Степени защиты корпуса КОМ; IP65/IP68 в ряду тапп-офф нет */
export const TAP_BOX_IP = [54, 55];
/** Число полюсов КОМ: 3P / 4P / 3P+N+PE */
export const TAP_BOX_POLES = [4, 5];
/** Токи КОМ, для которых на сайте есть отдельная страница */
export const TAP_BOX_PAGE = (a: number) => `/catalog/korobki-otvetvitelnye-tapp-off/tapp-off-${a}a`;

export type TapBox = {
  /** Артикул страницы каталога */
  sku: string;
  name: string;
  /** Номинальный ток отвода, А */
  ratedA: number;
  /** Аппарат защиты, встроенный в корпус этого номинала */
  device: string;
  /** Короткий код аппарата для строки заказа */
  deviceCode: string;
  ip: number[];
  poles: number[];
  /** true — номинал выше окна отбора, ставится на секцию отбора */
  viaSection: boolean;
  page: string;
};

/**
 * Аппарат защиты не выбирается, а следует из номинала корпуса:
 * 16–63 А — модульный автомат C/D, 125–630 А — автомат с термомагнитным расцепителем.
 * Источник: строка «Аппарат защиты» страниц тапп-офф.
 */
export const TAP_BOXES_FULL: TapBox[] = TAP_BOXES.map((a) => ({
  sku: `TAPP-OFF-${a}A`,
  name: `КОМ ${a} А`,
  ratedA: a,
  device: a <= 63 ? "Автомат C/D" : "Автомат с термомагнитным расцепителем",
  deviceCode: a <= 63 ? "C" : "TM",
  ip: TAP_BOX_IP,
  poles: TAP_BOX_POLES,
  viaSection: a > TAP_WINDOW_MAX,
  page: TAP_BOX_PAGE(a),
}));

/** Минимальный достаточный корпус КОМ под требуемый ток отвода */
export const boxFor = (a: number): TapBox | null => TAP_BOXES_FULL.find((b) => b.ratedA >= a) ?? null;

/* ═══════════════════════════════════════════════════════════════════
   Нормы раскладки KLM-S из каталога V3.
   До этого раздела значения брались из ТЗ как отраслевые ориентиры
   и были помечены как неподтверждённые. Теперь это заводские данные.
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Нестандартные длины прямой секции FE-S (CATALOG-V3 стр. 5 и 8).
 * Код S1/S2/S3 попадает в артикул и влияет на срок изготовления.
 */
export const NON_STANDARD_LENGTHS = [
  { code: "S1", minMm: 500, maxMm: 999 },
  { code: "S2", minMm: 1000, maxMm: 1999 },
  { code: "S3", minMm: 2000, maxMm: 2999 },
] as const;

/** Код нестандартной длины по размеру; null — размер стандартный или вне ряда */
export const nonStandardCode = (mm: number): string | null =>
  NON_STANDARD_LENGTHS.find((n) => mm >= n.minMm && mm <= n.maxMm)?.code ?? null;

/**
 * Доборная секция. CATALOG-V3 стр. 8: длина заказа = замеренное расстояние
 * между шинами смежных секций минус 25 мм на установку стыка.
 */
export const JOINT_ALLOWANCE_MM = 25;
export const makeUpSectionMm = (gapMm: number) => gapMm - JOINT_ALLOWANCE_MM;

/**
 * Компенсационная секция CML. CATALOG-V3 стр. 21: на прямых участках трассы
 * с алюминиевым проводником — не более 30 м, с медным — не более 45 м.
 * Это заводская норма, она заменяет расчёт «по допуску стыка» из ТЗ 7.7.
 */
export const COMPENSATOR_MAX_RUN_M: Record<BusMaterial, number> = { Al: 30, Cu: 45 };
/** Длина компенсационной секции, мм (CATALOG-V3 стр. 21) */
export const COMPENSATOR_LEN_MM = 1500;

/**
 * Комплект огнестойкой проходки FB. CATALOG-V3 стр. 23: стены и перекрытия
 * толщиной не менее 200 мм, огнестойкость не менее 180 минут по
 * ГОСТ 53310-2009 п. 4.1. В спецификацию комплекта производитель требует
 * отдельно включать материалы заделки швов.
 */
export const FIRE_BARRIER = {
  minWallMm: 200,
  ratingMin: 180,
  norm: "ГОСТ 53310-2009 п. 4.1",
  /** Позиции, которые идут в спецификацию вместе с комплектом */
  extras: ["Противопожарный терморасширяющийся герметик", "Огнестойкая монтажная пена"],
} as const;

/** Материал корпуса — цифра в артикуле (CATALOG-V3 стр. 5) */
export const HOUSING_CODES: { code: number; label: string }[] = [
  { code: 1, label: "Оцинкованная сталь" },
  { code: 3, label: "Алюминиевый корпус" },
  { code: 4, label: "Нержавеющая сталь" },
];

/** Состав проводников — цифра в артикуле (CATALOG-V3 стр. 5) */
export const CONDUCTOR_CODES: { code: number; label: string; poles: number }[] = [
  { code: 3, label: "3L+PE (корпус)", poles: 4 },
  { code: 4, label: "3L+N+PE (корпус)", poles: 4 },
  { code: 5, label: "3L+N+PE", poles: 5 },
  { code: 6, label: "3L+200%N+PE", poles: 5 },
  { code: 7, label: "3L+N+50%PE", poles: 5 },
  { code: 8, label: "3L+N+200%PE", poles: 5 },
];

/** Код номинала в артикуле KLM-S: 160 А → «01», 6300 А → «63» (CATALOG-V3 стр. 5) */
export const RATED_CODE: Record<number, string> = {
  160: "01", 250: "02", 315: "03", 400: "04", 500: "05", 630: "06", 800: "08",
  1000: "10", 1250: "12", 1600: "16", 2000: "20", 2500: "25", 3200: "32",
  4000: "40", 5000: "50", 6300: "63",
};

/**
 * Обозначения секций KLM-S (CATALOG-V3 стр. 5). Используются в артикуле
 * и связывают классы элементов спецификации с номенклатурой завода.
 */
export const SECTION_CODES: { code: string; label: string }[] = [
  { code: "FE", label: "Прямая секция стандартного размера" },
  { code: "Pi", label: "Прямая секция с окнами отбора мощности" },
  { code: "CD", label: "Секция угловая горизонтальная" },
  { code: "CP", label: "Секция угловая вертикальная" },
  { code: "ZD", label: "Секция Z-образная горизонтальная" },
  { code: "ZP", label: "Секция Z-образная вертикальная" },
  { code: "TD", label: "Секция тройниковая горизонтальная" },
  { code: "TP", label: "Секция тройниковая вертикальная" },
  { code: "ZDP", label: "Секция угловая комбинированная" },
  { code: "ATSC", label: "Секция присоединительная к панелям" },
  { code: "ATCP", label: "Секция присоединительная с вертикальным углом" },
  { code: "ATCD", label: "Секция присоединительная с горизонтальным углом" },
  { code: "ATT", label: "Секция присоединительная к трансформатору" },
  { code: "FEB", label: "Коробка концевого питания" },
  { code: "CML", label: "Компенсационная секция" },
  { code: "FLX", label: "Гибкая секция" },
  { code: "RE", label: "Редукционная секция" },
  { code: "G", label: "Стыковочный элемент" },
  { code: "GF", label: "Стыковочный элемент для коробки отбора Bolt-on" },
  { code: "EC", label: "Концевая заглушка" },
  { code: "FB", label: "Комплект для огнестойкой проходки шинопроводов" },
  { code: "ADP", label: "Секция соединения с другими типами шинопроводов" },
  { code: "PB", label: "Коробка отбора мощности типа Plug-in" },
  { code: "BB", label: "Коробка отбора мощности типа Bolt-on" },
];

/**
 * Геометрия штатных углов, мм (CATALOG-V3 стр. 9 и 10).
 * Горизонтальный угол CD одинаков на всём ряду; вертикальный CP растёт с номиналом.
 * Нужны, чтобы вычитать длину угла из прямых участков (ТЗ 8.3) — до каталога
 * этих габаритов не было и раздел выдавал предупреждение вместо числа.
 */
export const CORNER_HORIZONTAL_MM = 435;

export const CORNER_VERTICAL_MM: Record<BusMaterial, Record<number, number>> = {
  Al: {
    160: 300, 250: 300, 315: 300, 400: 300, 500: 300, 630: 300, 800: 300,
    1000: 450, 1250: 450, 1600: 450, 2000: 450, 2500: 600, 3200: 650,
    4000: 750, 5000: 950, 6300: 1100,
  },
  Cu: {
    160: 300, 250: 300, 315: 300, 400: 300, 500: 300, 630: 300, 800: 300,
    1000: 300, 1250: 450, 1600: 450, 2000: 450, 2500: 450, 3200: 600,
    4000: 650, 5000: 750, 6300: 950,
  },
};

/** Плечо вертикального угла для номинала; для промежуточных берётся ближайший больший */
export const cornerVerticalMm = (material: BusMaterial, ratedA: number): number => {
  const table = CORNER_VERTICAL_MM[material];
  const key = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)
    .find((a) => a >= ratedA);
  return key != null ? table[key] : CORNER_VERTICAL_MM[material][6300];
};

export const IP_ENV: { key: string; label: string; ip: number; hint: string }[] = [
  { key: "dry", label: "Сухое помещение", ip: 54, hint: "ЦОД, электрощитовая, офис — пыль и брызги" },
  { key: "dusty", label: "Цех, пыль и струи воды", ip: 55, hint: "производство, склад, парковка" },
  { key: "wash", label: "Мойка, пищевое производство", ip: 65, hint: "литой корпус, полная пылезащита" },
  { key: "outdoor", label: "Улица, агрессивная среда", ip: 68, hint: "литой шинопровод, наружная установка" },
];

/** Типовые объекты и подсказка по мощности — из FAQ страниц каталога */
export const OBJECTS: { key: string; label: string; hint: string; solution: string }[] = [
  { key: "datacenter", label: "Дата-центр / ЦОД", hint: "обычно ШМА 4000–6300 А, 2N", solution: "/solutions/data-center" },
  { key: "factory", label: "Завод, производственный цех", hint: "обычно ШМА 1600–3200 А", solution: "/solutions/factory" },
  { key: "mall", label: "ТЦ, бизнес-центр", hint: "обычно ШМА 1000–2500 А", solution: "/solutions/grsh" },
  { key: "residential", label: "Жилой комплекс", hint: "стояки ШМА 630–1600 А", solution: "/solutions/jk" },
  { key: "airport", label: "Аэропорт, инфраструктура", hint: "ШМА + ТПЛ 10 кВ", solution: "/solutions/airport" },
  { key: "crane", label: "Краны, конвейеры, монорельс", hint: "троллейный KLM-T 100–800 А", solution: "/trolley-shinoprovod" },
  { key: "substation", label: "Подстанция, энергетика", hint: "токопровод ТПЛ 6–35 кВ", solution: "/solutions/tokoprovod" },
  { key: "oilgas", label: "Нефтегаз, химия", hint: "литой IP68, огнестойкость E120", solution: "/solutions/oil-gas" },
];

/** Аналоги ушедших брендов — габариты секций совпадают, замена 1:1 */
export const IMPORT_ANALOGS: { brand: string; product: string; page: string }[] = [
  { brand: "Schneider Electric", product: "Canalis KS / KT", page: "/analog-schneider-electric" },
  { brand: "Siemens", product: "Sivacon 8PS", page: "/analog-siemens" },
  { brand: "Legrand", product: "Zucchini", page: "/analog-legrand" },
  { brand: "ABB", product: "MNS", page: "/analog-abb" },
  { brand: "EAE", product: "E-Line KX", page: "/compare/eae" },
];

export const COMPANY = {
  name: "ООО «КЛМ»",
  alt: "Главпроект",
  since: 2006,
  registry: "10728864",
  phone: "+7 (499) 444-70-05",
  email: "info@glavproekt.com",
  hours: "Пн–Пт · 9:00–18:00 МСК",
  plant: "Владимирская область",
  cert: "ISO 9001 · ГОСТ Р МЭК 61439",
  site: SITE,
};
