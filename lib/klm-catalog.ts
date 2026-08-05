/**
 * РЕАЛЬНЫЙ СПРАВОЧНИК КЛМ. Собран из публичного сайта заказчика 2026-08-05.
 * Первоисточник и порядок обновления — data/klm-source/README.md.
 * Числа взяты из таблиц «Технические характеристики» страниц каталога;
 * поле source у каждой записи ведёт на исходную страницу.
 */

export const SITE = "https://xn--b1aekkfgciabim3h.xn--p1ai";
export const SNAPSHOT = "2026-08-05";

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
  voltageV: number;
  ip: number[];
  /** Максимальный ток отвода на одно окно, А; null — отборов по длине нет */
  tapMaxA: number | null;
  /** Шаг окон отбора, м */
  tapPitchM: number[];
  shortCircuitKA: number;
  sectionLenMm: [number, number];
  specs: Record<string, string>;
  source: string;
};

export const SERIES: BusbarSeries[] = [
  {
    key: "S",
    name: "KLM-S",
    title: "Магистральный ШМА · сэндвич",
    duty: "main",
    currents: [160, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300, 10000],
    copperOnly: [160, 250, 400, 630, 800, 1000, 1250, 1600, 2000],
    materials: ["Cu", "Al"],
    voltageV: 1000,
    ip: [54, 55, 65, 68],
    tapMaxA: null,
    tapPitchM: [],
    shortCircuitKA: 150,
    sectionLenMm: [1000, 3000],
    specs: {
      "Номинальный ток": "160–10 000 А",
      Напряжение: "до 1000 В AC",
      Частота: "50 / 60 Гц",
      "Материал шин": "Cu / Al",
      "Степень защиты": "IP54 / IP55 / IP65 / IP68",
      "Класс изоляции": "Nomex®, F (155 °C)",
      Огнестойкость: "до E120",
      "Стойкость к КЗ": "до 150 кА",
      "Длина секции": "1000–3000 мм",
      "Срок службы": "не менее 35 лет",
    },
    source: "/catalog/shinoprovod-magistralnyy",
  },
  {
    key: "R",
    name: "KLM-R",
    title: "Распределительный ШРА · с окнами отбора",
    duty: "distribution",
    currents: [100, 160, 250, 400, 630, 800, 1000, 1600],
    copperOnly: [],
    materials: ["Cu", "Al"],
    voltageV: 1000,
    ip: [54, 55],
    tapMaxA: 250,
    tapPitchM: [0.5, 1],
    shortCircuitKA: 50,
    sectionLenMm: [1000, 3000],
    specs: {
      "Номинальный ток": "100–1600 А",
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
    voltageV: 690,
    ip: [55, 65],
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
    voltageV: 35000,
    ip: [54, 65],
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
/** Выше этого номинала отвод идёт не через окно, а через секцию отбора */
export const TAP_WINDOW_MAX = 250;

export const IP_ENV: { key: string; label: string; ip: number; hint: string }[] = [
  { key: "dry", label: "Сухое помещение", ip: 54, hint: "ЦОД, электрощитовая, офис — пыль и брызги" },
  { key: "dusty", label: "Цех, пыль и струи воды", ip: 55, hint: "производство, склад, парковка" },
  { key: "wash", label: "Мойка, пищевое производство", ip: 65, hint: "литой корпус, полная пылезащита" },
  { key: "outdoor", label: "Улица, агрессивная среда", ip: 68, hint: "литой шинопровод, наружная установка" },
];

/** Токи КОМ, для которых на сайте есть отдельная страница */
export const TAP_BOX_PAGE = (a: number) => `/catalog/korobki-otvetvitelnye-tapp-off/tapp-off-${a}a`;

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
