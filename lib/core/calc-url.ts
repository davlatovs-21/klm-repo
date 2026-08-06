/**
 * Кодирование исходных данных расчёта в адрес страницы — требование M1.9 ТЗ:
 * ссылку на результат должно быть можно переслать коллеге.
 *
 * Разбор строгий: неизвестная серия задачи, число вне ряда или мусор в параметре
 * не роняют страницу и не подставляются молча — берётся значение по умолчанию.
 */
import { DEFAULT_INPUT, MOUNT_FACTOR, VOLTAGES, type Input } from "./select-busbar";
import { IP_ENV, SERIES, type BusMaterial, type Duty } from "./klm-catalog";

const DUTIES = SERIES.map((s) => s.duty);
const ENV_KEYS = IP_ENV.map((e) => e.key);
const MOUNT_WAYS = Object.keys(MOUNT_FACTOR) as (keyof typeof MOUNT_FACTOR)[];
const FIRE = [0, 60, 120] as const;

/** Короткие имена параметров: ссылка должна оставаться читаемой и не разрастаться */
const KEYS: Record<string, keyof Input> = {
  d: "duty", m: "mode", p: "powerKW", cf: "cosPhi", kc: "demand", i: "currentA",
  u: "voltageV", t: "ambientC", mw: "mountWay", pr: "parallelRuns", alt: "altitudeM",
  e: "env", mat: "material", fe: "fireE", l: "routeLenM", taps: "taps",
};

export function encodeInput(s: Input): string {
  const p = new URLSearchParams();
  for (const [short, key] of Object.entries(KEYS)) {
    const v = s[key];
    if (key === "taps") {
      if ((v as number[]).length > 0) p.set(short, (v as number[]).join(","));
      continue;
    }
    // в ссылку пишем только то, что отличается от значения по умолчанию
    if (v !== DEFAULT_INPUT[key]) p.set(short, String(v));
  }
  return p.toString();
}

export function decodeInput(query: string): Input {
  const p = new URLSearchParams(query);
  const num = (short: string, fallback: number, min: number, max: number) => {
    const raw = p.get(short);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  };
  const oneOf = <T,>(short: string, allowed: readonly T[], fallback: T): T => {
    const raw = p.get(short);
    return (allowed as readonly unknown[]).includes(raw as unknown) ? (raw as T) : fallback;
  };

  const duty = oneOf<Duty>("d", DUTIES, DEFAULT_INPUT.duty);
  const allowedVolts = VOLTAGES[duty];
  const voltageRaw = num("u", DEFAULT_INPUT.voltageV, 1, 35000);

  return {
    duty,
    mode: oneOf("m", ["power", "current"] as const, DEFAULT_INPUT.mode),
    powerKW: num("p", DEFAULT_INPUT.powerKW, 0, 1e6),
    cosPhi: num("cf", DEFAULT_INPUT.cosPhi, 0.1, 1),
    demand: num("kc", DEFAULT_INPUT.demand, 0.1, 1),
    currentA: num("i", DEFAULT_INPUT.currentA, 0, 1e5),
    // напряжение обязано быть из ряда, допустимого для этой задачи
    voltageV: allowedVolts.includes(voltageRaw) ? voltageRaw : allowedVolts[0],
    ambientC: num("t", DEFAULT_INPUT.ambientC, -60, 120),
    mountWay: oneOf("mw", MOUNT_WAYS, DEFAULT_INPUT.mountWay),
    parallelRuns: Math.round(num("pr", DEFAULT_INPUT.parallelRuns, 1, 10)),
    altitudeM: num("alt", DEFAULT_INPUT.altitudeM, 0, 6000),
    env: oneOf("e", ENV_KEYS, DEFAULT_INPUT.env),
    material: oneOf<BusMaterial | "any">("mat", ["any", "Al", "Cu"] as const, DEFAULT_INPUT.material),
    fireE: FIRE.find((f) => String(f) === p.get("fe")) ?? DEFAULT_INPUT.fireE,
    routeLenM: num("l", DEFAULT_INPUT.routeLenM, 1, 10000),
    taps: (p.get("taps") ?? "")
      .split(",")
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 1000)
      .slice(0, 64),
  };
}
