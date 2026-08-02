/**
 * ДЕМОНСТРАЦИОННЫЙ СПРАВОЧНИК. Все значения условные.
 * В MVP заменяется на catalog.json, переданный Заказчиком по Этапу 0 (раздел 4 ТЗ).
 * Интерфейс и логика при замене не меняются — см. раздел 9.4 ТЗ.
 */

export type SeriesKey = "S" | "R";
export type Mount = "plug" | "bolt";
export type Protection = "breaker" | "fuse" | "none";
export type Material = "Al" | "Cu";

export type Series = {
  name: string;
  title: string;
  desc: string;
  currents: number[];
  materials: Material[];
  mounts: Mount[];
  poles: number[];
  tapMax: number;
};

export const SERIES: Record<SeriesKey, Series> = {
  S: {
    name: "KLM-S",
    title: "Осветительный",
    desc: "Лёгкие трассы, освещение, розеточные группы",
    currents: [160, 250, 400, 630],
    materials: ["Al"],
    mounts: ["plug"],
    poles: [4],
    tapMax: 100,
  },
  R: {
    name: "KLM-R",
    title: "Распределительный",
    desc: "Основная рабочая серия для цехов и этажей",
    currents: [250, 400, 630, 800, 1000, 1250, 1600, 2000],
    materials: ["Al", "Cu"],
    mounts: ["plug", "bolt"],
    poles: [4, 5],
    tapMax: 250,
  },
};

export const SERIES_KEYS = Object.keys(SERIES) as SeriesKey[];

/** Позиция 2 кода заказа — двузначный код номинала магистрали */
export const SIZE_CODE: Record<number, string> = {
  160: "02", 250: "03", 400: "04", 630: "06", 800: "08",
  1000: "10", 1250: "12", 1600: "16", 2000: "20",
};

export const TAP_CURRENTS = [16, 25, 32, 40, 63, 80, 100, 125, 160, 200, 250, 400];

export const PROTECTION: Record<Protection, { label: string; code: string; max: number }> = {
  breaker: { label: "Автомат", code: "B", max: 400 },
  fuse: { label: "Предохранитель", code: "F", max: 160 },
  none: { label: "Без защиты", code: "N", max: 63 },
};
export const PROTECTION_KEYS = Object.keys(PROTECTION) as Protection[];

export const MOUNT: Record<Mount, { label: string; code: string; hint: string }> = {
  plug: { label: "Plug-in", code: "P", hint: "Штепсельный · монтаж под напряжением" },
  bolt: { label: "Bolt-on", code: "B", hint: "Болтовой · со снятием напряжения" },
};

export const IP_LIST = [54, 55, 65];
export const IP_TEXT: Record<number, string> = {
  54: "пыль, брызги воды",
  55: "пыль, струи воды",
  65: "полная пылезащита",
};

/** Порог обязательного применения рукоятки управления (открытый вопрос №4 ТЗ) */
export const HANDLE_THRESHOLD = 125;
/** Доля тока магистрали, доступная отводам (открытый вопрос №3 ТЗ) */
export const LOAD_SHARE = 0.4;

export type Model = {
  code: string;
  series: SeriesKey[];
  mount: Mount[];
  max: number;
  prot: Protection[];
  ip: number[];
  poles: number[];
  weight: string;
  size: string;
};

export const MODELS: Model[] = [
  { code: "КОМ-S63-P",  series: ["S"], mount: ["plug"], max: 63,  prot: ["breaker", "fuse", "none"], ip: [54, 55],     poles: [4],    weight: "3,2 кг",  size: "210×160×120" },
  { code: "КОМ-S100-P", series: ["S"], mount: ["plug"], max: 100, prot: ["breaker", "fuse"],         ip: [54, 55],     poles: [4],    weight: "4,4 кг",  size: "260×180×130" },
  { code: "КОМ-R63-P",  series: ["R"], mount: ["plug"], max: 63,  prot: ["breaker", "fuse", "none"], ip: [54, 55, 65], poles: [4, 5], weight: "3,6 кг",  size: "230×170×125" },
  { code: "КОМ-R125-P", series: ["R"], mount: ["plug"], max: 125, prot: ["breaker", "fuse"],         ip: [54, 55, 65], poles: [4, 5], weight: "5,8 кг",  size: "300×200×140" },
  { code: "КОМ-R250-P", series: ["R"], mount: ["plug"], max: 250, prot: ["breaker"],                 ip: [55, 65],     poles: [4, 5], weight: "9,4 кг",  size: "380×250×160" },
  { code: "КОМ-R125-B", series: ["R"], mount: ["bolt"], max: 125, prot: ["breaker", "fuse"],         ip: [54, 55, 65], poles: [4, 5], weight: "5,4 кг",  size: "295×195×140" },
  { code: "КОМ-R250-B", series: ["R"], mount: ["bolt"], max: 250, prot: ["breaker", "fuse"],         ip: [54, 55, 65], poles: [4, 5], weight: "8,7 кг",  size: "370×240×160" },
];
