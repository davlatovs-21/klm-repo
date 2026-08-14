/**
 * Расчётное ядро подмодуля «КОМ». Не зависит от интерфейса (раздел 9.2 ТЗ).
 * Все пределы берутся из справочника (lib/catalog.ts → lib/klm-catalog.ts),
 * в этом файле только правила.
 */
import {
  SERIES, SERIES_HINT, BOX_IP, HANDLE_THRESHOLD, TAP_WINDOW_MAX, TAP_CURRENTS,
  CONNECTION, INSTALL_NOTE, boxFor, busSku, fitToSeries,
  type SeriesKey, type Material, type TapBox,
} from "./catalog";

export type Config = {
  series: SeriesKey;
  busCurrent: number;
  material: Material;
  poles: number;
  busIP: number;
  /** Требуемый ток одного отвода, А */
  tapCurrent: number;
  /** Сколько таких отводов снимается с этой трассы */
  tapCount: number;
  handle: boolean;
  boxIP: number;
};

export type Check = {
  name: string;
  ok: boolean;
  /** ok, но с оговоркой: конфигурация проходит, требует внимания проектировщика */
  warn?: boolean;
  text: string;
  /** что показать, когда правило выполнено; по умолчанию — «соответствует» */
  info?: string;
  fix?: Partial<Config>;
  fixLabel?: string;
};

export type Result = {
  checks: Check[];
  ok: boolean;
  box: TapBox | null;
  /** Суммарный ток отводов, А */
  total: number;
  /** Сколько тока даёт магистраль, А — это её номинал, а не доля от него */
  limit: number;
  notes: string[];
};

export const DEFAULT_CONFIG: Config = {
  series: "R", busCurrent: 630, material: "Al", poles: 4, busIP: 55,
  tapCurrent: 63, tapCount: 1, handle: false, boxIP: 55,
};

export function runChecks(s: Config): Result {
  const cfg = SERIES[s.series];
  const compat = cfg.tapBoxCompatA;
  const total = s.tapCurrent * s.tapCount;
  const limit = s.busCurrent;
  const checks: Check[] = [];

  const add = (
    name: string, ok: boolean, text: string,
    fix?: Partial<Config>, fixLabel?: string, warn = false, info?: string,
  ) => checks.push({ name, ok, warn, text, fix, fixLabel, info });

  const toR = fitToSeries("R", s);

  /**
   * 1. Серия. По каталогу V3 коробки отбора ставятся и на магистральный KLM-S
   * (Plug-in в окно секции Pi, Bolt-on на стык), и на распределительный KLM-R.
   * Раньше здесь стояло «только KLM-R» — это опровергнуто каталогом стр. 24.
   * Троллейный и ТПЛ окон отбора не имеют, для них правило по-прежнему не проходит.
   */
  add("Серия под отводы", compat != null,
    `${cfg.name} — ${cfg.title}. ${SERIES_HINT[s.series]}`,
    toR, "Перейти на KLM-R", false,
    "КОМ ставятся на магистральный KLM-S и распределительный KLM-R");

  // 2. Номинал магистрали в диапазоне совместимости КОМ (ШРА КЛМ-Р 250–1600 А)
  const inCompat = compat != null && s.busCurrent >= compat[0] && s.busCurrent <= compat[1];
  add("Совместимость с магистралью", inCompat,
    compat == null
      ? `У серии ${cfg.name} окон отбора нет — диапазон совместимости КОМ не задан`
      : `КОМ встают на ${cfg.name} ${compat[0]}–${compat[1]} А, у вас ${s.busCurrent} А`,
    compat != null ? { busCurrent: compat[0] } : toR,
    compat != null ? `Поднять до ${compat[0]} А` : "Перейти на KLM-R", false,
    compat != null ? `Номинал ${s.busCurrent} А в диапазоне ${compat[0]}–${compat[1]} А` : undefined);

  // 3. Материал шин
  add("Материал шин", cfg.materials.includes(s.material),
    `${cfg.name} выпускается с шинами ${cfg.materials.join(" / ")}`,
    { material: cfg.materials[0] }, `Взять ${cfg.materials[0]}`, false,
    `${s.material} допустим для ${cfg.name}`);

  // 4. Число проводников
  add("Число проводников", cfg.poles.includes(s.poles),
    `${cfg.name} поставляется на ${cfg.poles.join(" или ")} проводника`,
    { poles: cfg.poles[0] }, `${cfg.poles[0]} проводника`, false,
    s.poles === 4 ? "4 проводника — 3L + PEN" : "5 проводников — 3L + N + PE");

  // 5. Ток отвода в ряду КОМ 16–630 А
  const box = boxFor(s.tapCurrent);
  const maxBox = TAP_CURRENTS[TAP_CURRENTS.length - 1];
  add("Ток отвода в ряду КОМ", box != null,
    `Ряд КОМ заканчивается на ${maxBox} А, запрошено ${s.tapCurrent} А — нужна секция отбора или второй отвод`,
    { tapCurrent: maxBox }, `Снизить до ${maxBox} А`, false,
    box ? `${s.tapCurrent} А → корпус ${box.ratedA} А, ${box.device.toLowerCase()}` : undefined);

  /**
   * 6. Окно отбора. Предел берётся у серии, а не из общей константы:
   * у KLM-S с одного окна снимается до 630 А (каталог V3, стр. 8),
   * у ШРА KLM-R — до 250 А. Общее число врало бы на одной из серий.
   */
  const windowMax = cfg.tapMaxA ?? TAP_WINDOW_MAX;
  const viaSection = s.tapCurrent > windowMax;
  add("Способ подключения", true,
    `Отвод ${s.tapCurrent} А больше ${windowMax} А на окно — корпус ставится на секцию отбора, не в стандартное окно`,
    undefined, undefined, viaSection,
    `${CONNECTION}${cfg.tapPitchM.length > 0 ? `, шаг окон ${cfg.tapPitchM.map((p) => String(p).replace(".", ",")).join(" / ")} м` : ""}`);

  // 7. Нагрузка на магистраль: сумма отводов не выше номинала ШРА.
  //    Коэффициент одновременности принят 1,0 — сравниваются номиналы, а не фактические нагрузки.
  add("Нагрузка на магистраль", total <= limit,
    `Сумма отводов ${total} А выше номинала магистрали ${limit} А (коэффициент одновременности принят 1,0)`,
    s.tapCount > 1
      ? { tapCount: Math.max(1, Math.floor(limit / s.tapCurrent)) }
      : { busCurrent: cfg.currents.find((c) => c >= total) ?? cfg.currents[cfg.currents.length - 1] },
    s.tapCount > 1 ? `Оставить ${Math.max(1, Math.floor(limit / s.tapCurrent))}` : "Поднять магистраль", false,
    `${s.tapCount} × ${s.tapCurrent} А = ${total} А из ${limit} А магистрали`);

  // 8. Рукоятка управления
  add("Рукоятка управления", !(s.tapCurrent >= HANDLE_THRESHOLD && !s.handle),
    `От ${HANDLE_THRESHOLD} А рукоятка обязательна — отключение до вскрытия корпуса`,
    { handle: true }, "Добавить рукоятку", false,
    s.handle ? "Внешняя рукоятка управления заложена" : `До ${HANDLE_THRESHOLD} А рукоятка не обязательна`);

  // 9. Степень защиты: корпус не слабее трассы и в пределах ряда КОМ (IP54 / IP55)
  const boxIpOk = BOX_IP.includes(s.boxIP);
  add("Степень защиты корпуса", boxIpOk && s.boxIP >= s.busIP,
    !boxIpOk
      ? `Корпуса КОМ выпускаются в IP${BOX_IP.join(" / IP")}; IP${s.boxIP} в ряду нет`
      : `IP${s.boxIP} у коробки ниже IP${s.busIP} трассы — слабое место контура`,
    !boxIpOk
      ? { boxIP: BOX_IP[BOX_IP.length - 1] }
      : s.busIP > BOX_IP[BOX_IP.length - 1]
        ? { busIP: BOX_IP[BOX_IP.length - 1], boxIP: BOX_IP[BOX_IP.length - 1] }
        : { boxIP: s.busIP },
    `Взять IP${Math.min(Math.max(s.busIP, BOX_IP[0]), BOX_IP[BOX_IP.length - 1])}`, false,
    `IP${s.boxIP} у корпуса при IP${s.busIP} у трассы`);

  // Позиция справочника проверяется последней — после устранения нарушений 1–9 (пункт 6.2 ТЗ)
  const preOk = checks.every((c) => c.ok);
  const model = preOk && box && box.ip.includes(s.boxIP) && box.poles.includes(s.poles) ? box : null;
  add("Позиция в справочнике", preOk ? !!model : false,
    preOk
      ? "Под эту комбинацию нет позиции — нужен запрос на завод"
      : "Проверка выполняется после устранения нарушений выше",
    undefined, undefined, false, model ? `${model.sku} — страница ${model.page}` : undefined);

  const notes: string[] = [];
  if (model) {
    notes.push(`${INSTALL_NOTE}.`);
    if (model.ratedA > s.tapCurrent)
      notes.push(`Ближайший номинал ряда — ${model.ratedA} А; запас ${model.ratedA - s.tapCurrent} А к расчётным ${s.tapCurrent} А.`);
    if (model.viaSection)
      notes.push(`${model.ratedA} А выше окна отбора — заложить секцию отбора в раскладку трассы.`);
    if (s.material === "Al") notes.push("Алюминиевые шины: повторная протяжка контактных соединений через 500 ч работы.");
    if (s.tapCount > 1) notes.push(`${s.tapCount} отвода на трассе — проверить, что окна отбора не заняты и разнесены по фазам.`);
    if (s.handle) notes.push("Рукоятка управления выводится на лицевую сторону — оставить зону обслуживания 700 мм.");
    notes.push(`Напряжение КОМ — до 690 В AC, шинопровод ${cfg.name} — до ${cfg.voltageV} В.`);
  }

  return { checks, ok: checks.every((c) => c.ok), box: model, total, limit, notes };
}

export type Segment = { v: string; label: string; detail: string; step: 0 | 1 };

/** Строка заказа. Каждая позиция — реальный параметр каталога КЛМ. */
export function buildCode(s: Config): Segment[] {
  const cfg = SERIES[s.series];
  const box = boxFor(s.tapCurrent);
  return [
    {
      v: box?.sku ?? "—",
      label: "Коробка отбора",
      detail: box ? `${box.name} · ${box.device}` : `Нет корпуса на ${s.tapCurrent} А`,
      step: 1,
    },
    {
      v: busSku(s.series, s.busCurrent),
      label: "Шинопровод трассы",
      detail: `${cfg.name} · ${cfg.title} · ${s.busCurrent} А`,
      step: 0,
    },
    { v: s.material, label: "Материал шин", detail: s.material === "Cu" ? "Медь электротехническая" : "Алюминиевый сплав", step: 0 },
    { v: `IP${s.boxIP}`, label: "IP корпуса", detail: `IP${s.boxIP} — при IP${s.busIP} у трассы`, step: 1 },
    { v: `${s.poles}P`, label: "Проводники", detail: s.poles === 4 ? "3L + PEN" : "3L + N + PE", step: 0 },
    { v: box?.deviceCode ?? "—", label: "Аппарат защиты", detail: box?.device ?? "не определён", step: 1 },
    { v: s.handle ? "Y1" : "Y0", label: "Рукоятка", detail: s.handle ? "С внешней рукояткой управления" : "Без рукоятки", step: 1 },
    { v: `x${s.tapCount}`, label: "Количество", detail: `${s.tapCount} КОМ на трассе`, step: 1 },
  ];
}

export const codeString = (s: Config) => buildCode(s).map((x) => x.v).join(" ");

/** Ссылка на конфигурацию (пункт 5.7 ТЗ) — параметры кодируются в адрес страницы */
export function encodeConfig(s: Config): string {
  return new URLSearchParams(
    Object.entries(s).map(([k, v]) => [k, String(v)]),
  ).toString();
}

export function decodeConfig(q: string): Config | null {
  const p = new URLSearchParams(q);
  if (!p.get("series")) return null;
  const num = (k: keyof Config, d: number) => Number(p.get(k) ?? d) || d;
  return {
    series: p.get("series") === "S" ? "S" : "R",
    busCurrent: num("busCurrent", DEFAULT_CONFIG.busCurrent),
    material: p.get("material") === "Cu" ? "Cu" : "Al",
    poles: num("poles", DEFAULT_CONFIG.poles),
    busIP: num("busIP", DEFAULT_CONFIG.busIP),
    tapCurrent: num("tapCurrent", DEFAULT_CONFIG.tapCurrent),
    tapCount: num("tapCount", DEFAULT_CONFIG.tapCount),
    handle: p.get("handle") === "true",
    boxIP: num("boxIP", DEFAULT_CONFIG.boxIP),
  };
}

export const PRESETS: { name: string; bad?: boolean; state: Config }[] = [
  { name: "Щит 63 А", state: DEFAULT_CONFIG },
  {
    name: "Станок 125 А",
    state: { series: "R", busCurrent: 630, material: "Al", poles: 4, busIP: 55, tapCurrent: 125, tapCount: 1, handle: true, boxIP: 55 },
  },
  {
    name: "Два отвода 250 А",
    state: { series: "R", busCurrent: 630, material: "Cu", poles: 5, busIP: 55, tapCurrent: 250, tapCount: 2, handle: true, boxIP: 55 },
  },
  {
    name: "Отвод 400 А через секцию",
    state: { series: "R", busCurrent: 630, material: "Cu", poles: 5, busIP: 54, tapCurrent: 400, tapCount: 1, handle: true, boxIP: 55 },
  },
  {
    name: "Конфликт",
    bad: true,
    state: { series: "S", busCurrent: 2500, material: "Cu", poles: 4, busIP: 65, tapCurrent: 250, tapCount: 3, handle: false, boxIP: 54 },
  },
];
