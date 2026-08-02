/**
 * Расчётный модуль. Не зависит от интерфейса (раздел 9.2 ТЗ).
 * Правила 1–9 раздела 6.1 ТЗ.
 */
import {
  SERIES, MODELS, MOUNT, PROTECTION, SIZE_CODE, IP_TEXT,
  HANDLE_THRESHOLD, LOAD_SHARE,
  type SeriesKey, type Mount, type Protection, type Material, type Model,
} from "./catalog";

export type Config = {
  series: SeriesKey;
  busCurrent: number;
  material: Material;
  poles: number;
  busIP: number;
  mount: Mount;
  tapCurrent: number;
  tapCount: number;
  protection: Protection;
  handle: boolean;
  boxIP: number;
};

export type Check = {
  name: string;
  ok: boolean;
  text: string;
  fix?: Partial<Config>;
  fixLabel?: string;
};

export type Result = {
  checks: Check[];
  ok: boolean;
  model: Model | null;
  total: number;
  limit: number;
  notes: string[];
};

export const DEFAULT_CONFIG: Config = {
  series: "R", busCurrent: 630, material: "Cu", poles: 4, busIP: 55,
  mount: "plug", tapCurrent: 63, tapCount: 1, protection: "breaker",
  handle: false, boxIP: 55,
};

export function runChecks(s: Config): Result {
  const cfg = SERIES[s.series];
  const limit = Math.round(s.busCurrent * LOAD_SHARE);
  const total = s.tapCurrent * s.tapCount;
  const p = PROTECTION[s.protection];
  const checks: Check[] = [];

  const add = (name: string, ok: boolean, text: string, fix?: Partial<Config>, fixLabel?: string) =>
    checks.push({ name, ok, text, fix, fixLabel });

  add("Материал шин", cfg.materials.includes(s.material),
    `${cfg.name} выпускается только с шинами ${cfg.materials.join(" / ")}`,
    { material: cfg.materials[0] }, `Взять ${cfg.materials[0]}`);

  add("Тип установки", cfg.mounts.includes(s.mount),
    `Для ${cfg.name} доступна установка ${cfg.mounts.map((m) => MOUNT[m].label).join(" / ")}`,
    { mount: cfg.mounts[0] }, MOUNT[cfg.mounts[0]].label);

  add("Число проводников", cfg.poles.includes(s.poles),
    `${cfg.name} поставляется на ${cfg.poles.join(" или ")} проводника`,
    { poles: cfg.poles[0] }, `${cfg.poles[0]} проводника`);

  add("Предел тока отвода", s.tapCurrent <= cfg.tapMax,
    `Потолок отвода для ${cfg.name} — ${cfg.tapMax} А, запрошено ${s.tapCurrent} А`,
    { tapCurrent: cfg.tapMax }, `Снизить до ${cfg.tapMax} А`);

  add("Нагрузка на магистраль", total <= limit,
    `Сумма отводов ${total} А выше доступных ${limit} А (${Math.round(LOAD_SHARE * 100)} % от ${s.busCurrent} А)`,
    s.tapCount > 1
      ? { tapCount: 1 }
      : { busCurrent: cfg.currents.find((c) => c * LOAD_SHARE >= total) ?? cfg.currents[cfg.currents.length - 1] },
    s.tapCount > 1 ? "Оставить 1 отвод" : "Поднять магистраль");

  add("Аппарат защиты", s.tapCurrent <= p.max,
    `«${p.label}» применяется до ${p.max} А, отвод ${s.tapCurrent} А`,
    { protection: "breaker" }, "Поставить автомат");

  add("Рукоятка управления", !(s.tapCurrent >= HANDLE_THRESHOLD && !s.handle),
    `От ${HANDLE_THRESHOLD} А рукоятка обязательна — отключение до вскрытия корпуса`,
    { handle: true }, "Добавить рукоятку");

  add("Степень защиты", s.boxIP >= s.busIP,
    `IP${s.boxIP} у коробки ниже IP${s.busIP} трассы — слабое место контура`,
    { boxIP: s.busIP }, `Поднять до IP${s.busIP}`);

  // Правило 9 проверяется только после правил 1–8 (пункт 6.2 ТЗ)
  const preOk = checks.every((c) => c.ok);
  let model: Model | null = null;
  if (preOk) {
    model = MODELS
      .filter((m) =>
        m.series.includes(s.series) &&
        m.mount.includes(s.mount) &&
        m.prot.includes(s.protection) &&
        m.ip.includes(s.boxIP) &&
        m.poles.includes(s.poles) &&
        m.max >= s.tapCurrent)
      .sort((a, b) => a.max - b.max)[0] ?? null;
  }
  add("Модель в справочнике", preOk ? !!model : false,
    preOk
      ? "Под эту комбинацию нет позиции — нужен запрос на завод"
      : "Проверка выполняется после устранения нарушений выше");

  const notes: string[] = [];
  if (model) {
    const reserve = Math.round(((model.max - s.tapCurrent) / model.max) * 100);
    if (reserve >= 40) notes.push(`Запас по току ${reserve} % — при стабильной нагрузке подойдёт корпус на ступень ниже.`);
    if (s.mount === "bolt") notes.push("Bolt-on монтируется со снятием напряжения с секции — заложить окно в график работ.");
    if (s.material === "Al") notes.push("Алюминиевые шины: повторная протяжка контактных соединений через 500 ч работы.");
    if (s.tapCount > 1) notes.push(`${s.tapCount} отвода в одном корпусе — проверить раскладку кабельных вводов по месту.`);
    if (s.boxIP >= 65) notes.push("IP65: уплотнения вводов затягивать по моменту из паспорта, кабель заводить снизу.");
    if (s.handle) notes.push("Рукоятка управления выводится на лицевую сторону — оставить зону обслуживания 700 мм.");
  }

  return { checks, ok: checks.every((c) => c.ok), model, total, limit, notes };
}

export type Segment = { v: string; label: string; detail: string; step: 0 | 1 };

/** Структура кода заказа — раздел 7 ТЗ. Пример: KLM-R 06 Cu 55 4 1 PB 63 Y0 */
export function buildCode(s: Config): Segment[] {
  const cfg = SERIES[s.series];
  return [
    { v: cfg.name, label: "Серия", detail: `${cfg.title} · ${cfg.currents[0]}–${cfg.currents[cfg.currents.length - 1]} А`, step: 0 },
    { v: SIZE_CODE[s.busCurrent] ?? "··", label: "Типоразмер", detail: `Номинал магистрали ${s.busCurrent} А`, step: 0 },
    { v: s.material, label: "Материал шин", detail: s.material === "Cu" ? "Медь электротехническая" : "Алюминиевый сплав 6101", step: 0 },
    { v: String(s.busIP), label: "IP трассы", detail: `IP${s.busIP} — ${IP_TEXT[s.busIP]}`, step: 0 },
    { v: String(s.poles), label: "Проводники", detail: s.poles === 4 ? "3L + PEN" : "3L + N + PE", step: 0 },
    { v: String(s.tapCount), label: "Число отводов", detail: `${s.tapCount} отвод(а) в одном корпусе`, step: 1 },
    { v: MOUNT[s.mount].code + PROTECTION[s.protection].code, label: "Установка · защита", detail: `${MOUNT[s.mount].label} · ${PROTECTION[s.protection].label}`, step: 1 },
    { v: String(s.tapCurrent), label: "Ток отвода", detail: `${s.tapCurrent} А на один отвод`, step: 1 },
    { v: s.handle ? "Y1" : "Y0", label: "Рукоятка", detail: s.handle ? "С внешней рукояткой управления" : "Без рукоятки", step: 1 },
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
  const s: Config = {
    series: (p.get("series") === "S" ? "S" : "R"),
    busCurrent: num("busCurrent", DEFAULT_CONFIG.busCurrent),
    material: p.get("material") === "Al" ? "Al" : "Cu",
    poles: num("poles", 4),
    busIP: num("busIP", 55),
    mount: p.get("mount") === "bolt" ? "bolt" : "plug",
    tapCurrent: num("tapCurrent", 63),
    tapCount: num("tapCount", 1),
    protection: (["breaker", "fuse", "none"] as const).find((x) => x === p.get("protection")) ?? "breaker",
    handle: p.get("handle") === "true",
    boxIP: num("boxIP", 55),
  };
  return s;
}

export const PRESETS: { name: string; bad?: boolean; state: Config }[] = [
  { name: "Щит 63 А", state: DEFAULT_CONFIG },
  { name: "Станок 125 А", state: { series: "R", busCurrent: 800, material: "Al", poles: 4, busIP: 55, mount: "plug", tapCurrent: 125, tapCount: 1, protection: "breaker", handle: true, boxIP: 55 } },
  { name: "Два отвода 250 А", state: { series: "R", busCurrent: 1600, material: "Cu", poles: 5, busIP: 65, mount: "bolt", tapCurrent: 250, tapCount: 2, protection: "breaker", handle: true, boxIP: 65 } },
  { name: "Конфликт", bad: true, state: { series: "S", busCurrent: 250, material: "Al", poles: 4, busIP: 54, mount: "plug", tapCurrent: 250, tapCount: 1, protection: "none", handle: false, boxIP: 54 } },
];
