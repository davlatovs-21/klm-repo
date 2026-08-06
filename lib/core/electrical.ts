/**
 * Электрический расчёт трассы: падение напряжения, потери и TCO, токи КЗ,
 * тепловое расширение, подвесы. Разделы 7.4–7.8 ТЗ.
 *
 * Правила модуля (раздел 6, M4):
 *   — чистые функции, ноль обращений к БД, сети и часам;
 *   — характеристики (R, X, I_cw, I_pk, допуск стыка, шаг подвесов) приходят ПАРАМЕТРОМ
 *     из справочника, а не зашиты здесь. Их у КЛМ пока нет — см. docs/etap-0;
 *   — каждый результат несёт трассировку: формула, подстановка, число, ссылка на норматив
 *     (раздел 7.12 — это то, чем расчёт защищается перед экспертизой).
 */

export type Material = "Al" | "Cu";

/** Шаг трассировки расчёта: как получено число */
export type TraceStep = {
  what: string;
  formula?: string;
  substitution?: string;
  result: string;
  norm?: string;
};

export type Verdict = { ok: boolean; level: "ok" | "warn" | "error"; text: string };

const r2 = (x: number, n = 2) => Number(x.toFixed(n));
const sinFromCos = (cosPhi: number) => Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
const SQRT3 = Math.sqrt(3);

/* ═══════════════════════════════════════════════════════════════════
   7.4 Падение напряжения
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Нормы допустимой потери напряжения по участкам сети.
 *
 * ВАЖНО: в ТЗ 7.4 было «силовая ≤ 5 %, освещение ≤ 2,5 %, суммарно ≤ 5 %» — это
 * внутренне противоречиво (сумма не может быть меньше слагаемого). Нормативная
 * разбивка другая: 5 % отводится участку ТП → ВРУ, и ещё 2,5 % участку ВРУ → лампа,
 * что и даёт суммарные 7,5 % до самого дальнего светильника.
 */
export type DropRole = "tp-vru" | "power" | "lighting";

export const DROP_LIMITS: Record<DropRole, { pct: number; label: string; norm: string }> = {
  "tp-vru": {
    pct: 5,
    label: "ТП → ГРЩ / ВРУ",
    norm: "ГОСТ Р 50571.5.52-2011, прил. G; РД 34.20.185-94 п. 5.2.4 (0,38 кВ от ТП до ввода — 4–6 %)",
  },
  power: {
    pct: 4,
    label: "ВРУ → силовые электроприёмники",
    norm: "СП 256.1325800.2016 (актуализированная редакция СП 31-110-2003)",
  },
  lighting: {
    pct: 2.5,
    label: "ВРУ → освещение",
    norm: "СП 31-110-2003 п. 7.23 — суммарно от шин 0,4 кВ ТП до дальней лампы не более 7,5 %",
  },
};

export type FeedPoint = "end" | "center" | "both";

export type DropInput = {
  /** Ток нагрузки, А */
  currentA: number;
  /** Длина трассы, м */
  lengthM: number;
  /** Активное сопротивление шинопровода, Ом/км — из справочника по номиналу и материалу */
  rOhmKm: number;
  /** Индуктивное сопротивление, Ом/км */
  xOhmKm: number;
  cosPhi: number;
  /** Линейное напряжение, В */
  voltageV: number;
  /** Откуда питается трасса: с конца, из центра, с двух сторон */
  feed?: FeedPoint;
  role?: DropRole;
  /**
   * Нагрузка, распределённая по длине: [{ток, позиция от точки питания}].
   * Если задана — считается по моменту нагрузки Σ(I_i · L_i) вместо сосредоточенной.
   */
  distributed?: { currentA: number; positionM: number }[];
};

export type DropResult = {
  deltaU_V: number;
  deltaU_pct: number;
  limitPct: number;
  /** Эффективное сопротивление участка R·cosφ + X·sinφ, Ом/км */
  zEffOhmKm: number;
  /** Расчётная длина после учёта точки питания, м */
  effectiveLengthM: number;
  verdict: Verdict;
  trace: TraceStep[];
};

/**
 * ΔU = √3 · I · L · (R·cosφ + X·sinφ), L в км
 * Распределённая нагрузка — через момент: ΔU = √3 · Σ(I_i · L_i) · (R·cosφ + X·sinφ) / 1000
 * Питание из центра — расчётная длина делится пополам; с двух сторон — на четыре
 * (каждый луч несёт половину тока на половине длины).
 */
export function voltageDrop(i: DropInput): DropResult {
  const feed = i.feed ?? "end";
  const role = i.role ?? "power";
  const sinPhi = sinFromCos(i.cosPhi);
  const zEff = i.rOhmKm * i.cosPhi + i.xOhmKm * sinPhi;
  const trace: TraceStep[] = [];

  trace.push({
    what: "Эффективное сопротивление участка",
    formula: "Z_эф = R·cos φ + X·sin φ",
    substitution: `${i.rOhmKm}·${i.cosPhi} + ${i.xOhmKm}·${r2(sinPhi, 3)}`,
    result: `${r2(zEff, 4)} Ом/км`,
  });

  const feedDivisor = feed === "center" ? 2 : feed === "both" ? 4 : 1;
  let deltaU: number;
  let effectiveLengthM: number;

  if (i.distributed && i.distributed.length > 0) {
    // момент нагрузки: каждый отвод даёт вклад пропорционально своей позиции
    const momentAkm = i.distributed.reduce((a, t) => a + (t.currentA * t.positionM) / 1000, 0);
    deltaU = (SQRT3 * momentAkm * zEff) / feedDivisor;
    effectiveLengthM = Math.max(...i.distributed.map((t) => t.positionM)) / feedDivisor;
    trace.push({
      what: "Момент нагрузки по отводам",
      formula: "M = Σ(I_i · L_i)",
      substitution: i.distributed.map((t) => `${t.currentA}·${t.positionM}`).join(" + ") + " м·А",
      result: `${r2(momentAkm, 3)} кА·км`,
    });
    trace.push({
      what: "Падение напряжения при распределённой нагрузке",
      formula: "ΔU = √3 · M · Z_эф" + (feedDivisor > 1 ? ` / ${feedDivisor}` : ""),
      substitution: `1,732 · ${r2(momentAkm, 3)} · ${r2(zEff, 4)}${feedDivisor > 1 ? ` / ${feedDivisor}` : ""}`,
      result: `${r2(deltaU)} В`,
    });
  } else {
    effectiveLengthM = i.lengthM / feedDivisor;
    deltaU = (SQRT3 * i.currentA * (effectiveLengthM / 1000) * zEff);
    trace.push({
      what: "Расчётная длина с учётом точки питания",
      formula: feed === "end" ? "L_расч = L" : `L_расч = L / ${feedDivisor}`,
      substitution: `${i.lengthM} / ${feedDivisor}`,
      result: `${r2(effectiveLengthM, 1)} м`,
    });
    trace.push({
      what: "Падение напряжения",
      formula: "ΔU = √3 · I · L_расч · Z_эф",
      substitution: `1,732 · ${i.currentA} · ${r2(effectiveLengthM / 1000, 4)} · ${r2(zEff, 4)}`,
      result: `${r2(deltaU)} В`,
    });
  }

  const pct = (deltaU / i.voltageV) * 100;
  const limit = DROP_LIMITS[role];
  trace.push({
    what: "Относительная потеря напряжения",
    formula: "ΔU% = ΔU / U_ном · 100",
    substitution: `${r2(deltaU)} / ${i.voltageV} · 100`,
    result: `${r2(pct)} %`,
    norm: limit.norm,
  });

  const ok = pct <= limit.pct;
  return {
    deltaU_V: r2(deltaU),
    deltaU_pct: r2(pct),
    limitPct: limit.pct,
    zEffOhmKm: r2(zEff, 4),
    effectiveLengthM: r2(effectiveLengthM, 1),
    verdict: {
      ok,
      level: ok ? "ok" : "error",
      text: ok
        ? `ΔU ${r2(pct)} % — в пределах ${limit.pct} % для участка «${limit.label}»`
        : `ΔU ${r2(pct)} % превышает ${limit.pct} % для участка «${limit.label}» — поднять номинал или сменить точку питания`,
    },
    trace,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   7.5 Потери мощности и энергии, TCO
   ═══════════════════════════════════════════════════════════════════ */

export type LossInput = {
  currentA: number;
  rOhmKm: number;
  lengthM: number;
  /** Число часов использования максимума нагрузки в год (T_макс) */
  hoursPerYear: number;
  tariffPerKWh: number;
  years: number;
  /**
   * Нагрузка распределена по длине равномерно. Тогда потери втрое меньше,
   * чем при сосредоточенной в конце: ∫I²dl по линейно убывающему току даёт I²·L/3.
   */
  uniformlyDistributed?: boolean;
};

export type LossResult = {
  deltaP_kW: number;
  energyPerYear_kWh: number;
  costPerYear: number;
  costLifetime: number;
  trace: TraceStep[];
};

/** ΔP = 3 · I² · R · L / 1000 [кВт], R в Ом/км, L в км */
export function powerLosses(i: LossInput): LossResult {
  const lengthKm = i.lengthM / 1000;
  const shape = i.uniformlyDistributed ? 1 / 3 : 1;
  const deltaP = (3 * i.currentA ** 2 * i.rOhmKm * lengthKm * shape) / 1000;
  const energy = deltaP * i.hoursPerYear;
  const costYear = energy * i.tariffPerKWh;

  const trace: TraceStep[] = [
    {
      what: "Потери мощности",
      formula: "ΔP = 3 · I² · R · L / 1000" + (i.uniformlyDistributed ? " · 1/3" : ""),
      substitution: `3 · ${i.currentA}² · ${i.rOhmKm} · ${r2(lengthKm, 4)} / 1000${i.uniformlyDistributed ? " · 1/3" : ""}`,
      result: `${r2(deltaP, 3)} кВт`,
    },
    {
      what: "Потери энергии за год",
      formula: "W = ΔP · T_макс",
      substitution: `${r2(deltaP, 3)} · ${i.hoursPerYear}`,
      result: `${r2(energy)} кВт·ч`,
    },
    {
      what: `Стоимость потерь за ${i.years} лет`,
      formula: "C = W · тариф · срок",
      substitution: `${r2(energy)} · ${i.tariffPerKWh} · ${i.years}`,
      result: `${r2(costYear * i.years)} ₽`,
    },
  ];
  if (i.uniformlyDistributed)
    trace[0].norm = "Равномерно распределённая нагрузка: ∫I²dl = I²·L/3 против I²·L при сосредоточенной";

  return {
    deltaP_kW: r2(deltaP, 3),
    energyPerYear_kWh: r2(energy),
    costPerYear: r2(costYear),
    costLifetime: r2(costYear * i.years),
    trace,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   7.6 Токи короткого замыкания — ГОСТ 28249-93
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Ударный коэффициент. ГОСТ 28249-93 задаёт его таблицей по отношению R/X контура КЗ,
 * диапазон 1,1…1,8 — а НЕ «всегда 1,8», как было записано в ТЗ 7.6.
 * При известных R и X считаем по формуле МЭК 60909: κ = 1,02 + 0,98·e^(−3R/X).
 * Без R и X берём 1,8 — верхняя граница диапазона, то есть в запас.
 */
export const PEAK_FACTOR_DEFAULT = 1.8;

export function peakFactor(rOhm?: number, xOhm?: number): number {
  if (!rOhm || !xOhm || xOhm <= 0) return PEAK_FACTOR_DEFAULT;
  return r2(Math.min(2, Math.max(1, 1.02 + 0.98 * Math.exp((-3 * rOhm) / xOhm))), 3);
}

export type ShortCircuitInput = {
  voltageV: number;
  /** Задать ток КЗ напрямую, кА — если он известен из проекта */
  faultCurrentKA?: number;
  /** Либо мощность трансформатора, кВ·А, и напряжение КЗ, % — ток оценивается по ним */
  transformerKVA?: number;
  ukPct?: number;
  /** Из справочника серии: кратковременно допустимый ток 1 с и ударный ток, кА */
  icwKA: number;
  ipkKA: number;
  /** Сопротивления контура КЗ для уточнения ударного коэффициента, Ом */
  loopROhm?: number;
  loopXOhm?: number;
};

export type ShortCircuitResult = {
  ikKA: number;
  ipkKA: number;
  peakFactor: number;
  /** Импеданс трансформатора, Ом — null, если ток задан напрямую */
  ztOhm: number | null;
  checks: Verdict[];
  trace: TraceStep[];
};

export function shortCircuit(i: ShortCircuitInput): ShortCircuitResult {
  const trace: TraceStep[] = [];
  let ikKA: number;
  let ztOhm: number | null = null;

  if (i.faultCurrentKA != null) {
    ikKA = i.faultCurrentKA;
    trace.push({ what: "Ток КЗ задан проектом", result: `${ikKA} кА` });
  } else if (i.transformerKVA != null && i.ukPct != null) {
    // Zт = uк · U² / (100 · Sт); Sт в В·А, U в В
    const st = i.transformerKVA * 1000;
    ztOhm = (i.ukPct * i.voltageV ** 2) / (100 * st);
    ikKA = i.voltageV / (SQRT3 * ztOhm) / 1000;
    trace.push({
      what: "Импеданс трансформатора",
      formula: "Z_т = u_к · U² / (100 · S_т)",
      substitution: `${i.ukPct} · ${i.voltageV}² / (100 · ${st})`,
      result: `${r2(ztOhm, 5)} Ом`,
      norm: "ГОСТ 28249-93 «Короткие замыкания в электроустановках напряжением до 1 кВ»",
    });
    trace.push({
      what: "Ток трёхфазного КЗ на выводах трансформатора",
      formula: "I_к = U / (√3 · Z_т)",
      substitution: `${i.voltageV} / (1,732 · ${r2(ztOhm, 5)})`,
      result: `${r2(ikKA)} кА`,
      norm: "ГОСТ 28249-93",
    });
  } else {
    throw new Error("Нужен либо ток КЗ, либо мощность трансформатора с напряжением КЗ");
  }

  const kUd = peakFactor(i.loopROhm, i.loopXOhm);
  const ipk = kUd * Math.SQRT2 * ikKA;
  trace.push({
    what: "Ударный ток КЗ",
    formula: "i_уд = k_уд · √2 · I_к",
    substitution: `${kUd} · 1,414 · ${r2(ikKA)}`,
    result: `${r2(ipk)} кА`,
    norm:
      i.loopROhm && i.loopXOhm
        ? "k_уд по МЭК 60909: κ = 1,02 + 0,98·e^(−3R/X)"
        : `k_уд принят ${PEAK_FACTOR_DEFAULT} — верхняя граница диапазона 1,1…1,8 ГОСТ 28249-93 (R/X контура неизвестно)`,
  });

  const icwOk = i.icwKA >= ikKA;
  const ipkOk = i.ipkKA >= ipk;
  return {
    ikKA: r2(ikKA),
    ipkKA: r2(ipk),
    peakFactor: kUd,
    ztOhm: ztOhm != null ? r2(ztOhm, 5) : null,
    checks: [
      {
        ok: icwOk,
        level: icwOk ? "ok" : "error",
        text: icwOk
          ? `I_cw ${i.icwKA} кА ≥ I_к ${r2(ikKA)} кА`
          : `I_cw ${i.icwKA} кА ниже тока КЗ ${r2(ikKA)} кА — шинопровод не выдержит КЗ в этой точке`,
      },
      {
        ok: ipkOk,
        level: ipkOk ? "ok" : "error",
        text: ipkOk
          ? `I_pk ${i.ipkKA} кА ≥ i_уд ${r2(ipk)} кА`
          : `I_pk ${i.ipkKA} кА ниже ударного тока ${r2(ipk)} кА — электродинамическая стойкость не обеспечена`,
      },
    ],
    trace,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   7.7 Тепловое расширение и компенсаторы
   ═══════════════════════════════════════════════════════════════════ */

/** Коэффициент линейного расширения, 1/°C */
export const ALPHA: Record<Material, number> = { Al: 23e-6, Cu: 17e-6 };

export type ExpansionInput = {
  material: Material;
  lengthM: number;
  /** Расчётный перепад температуры шин за цикл работы, °C */
  deltaTC: number;
  /** Допуск стыка секции, мм — параметр справочника, ориентировочно 10–20 мм */
  jointToleranceMm: number;
  /** Число деформационных швов здания на трассе — на каждом компенсатор обязателен */
  buildingJoints?: number;
};

export type ExpansionResult = {
  deltaLMm: number;
  compensators: number;
  /** Максимальная длина участка между компенсаторами, м */
  spanM: number;
  trace: TraceStep[];
};

/** Δl = α · L · ΔT [мм], L в мм */
export function thermalExpansion(i: ExpansionInput): ExpansionResult {
  const alpha = ALPHA[i.material];
  const deltaL = alpha * (i.lengthM * 1000) * i.deltaTC;
  const byExpansion = Math.max(0, Math.ceil(deltaL / i.jointToleranceMm) - 1);
  const compensators = Math.max(byExpansion, i.buildingJoints ?? 0);
  const spanM = compensators > 0 ? i.lengthM / (compensators + 1) : i.lengthM;

  return {
    deltaLMm: r2(deltaL, 1),
    compensators,
    spanM: r2(spanM, 1),
    trace: [
      {
        what: "Удлинение трассы",
        formula: "Δl = α · L · ΔT",
        substitution: `${alpha.toExponential(0)} · ${i.lengthM * 1000} мм · ${i.deltaTC} °C`,
        result: `${r2(deltaL, 1)} мм`,
        norm: `α(${i.material}) = ${(alpha * 1e6).toFixed(0)}·10⁻⁶ 1/°C`,
      },
      {
        what: "Компенсаторы по тепловому расширению",
        formula: "n = ⌈Δl / допуск стыка⌉ − 1",
        substitution: `⌈${r2(deltaL, 1)} / ${i.jointToleranceMm}⌉ − 1`,
        result: `${byExpansion} шт`,
      },
      ...(i.buildingJoints
        ? [
            {
              what: "Деформационные швы здания",
              result: `${i.buildingJoints} шт — компенсатор на каждом обязателен`,
            },
          ]
        : []),
      {
        what: "Итого компенсаторов",
        formula: "n = max(по расширению, по швам)",
        result: `${compensators} шт, участок между ними ${r2(spanM, 1)} м`,
      },
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════════
   7.8 Подвесы и крепления
   ═══════════════════════════════════════════════════════════════════ */

export type HangerInput = {
  lengthM: number;
  /** Шаг подвесов, м — параметр справочника по серии и ориентации */
  pitchM: number;
  /** Число углов, тройников и тяжёлых элементов: у каждого подвес в пределах 0,5 м */
  heavyPoints?: number;
  /** Масса погонного метра трассы, кг */
  weightPerMKg: number;
  /** Коэффициент запаса по нагрузке на подвес */
  safety?: number;
};

export type HangerResult = {
  count: number;
  loadPerHangerKg: number;
  trace: TraceStep[];
};

/** n = ⌈L / шаг⌉ + 1, плюс по одному у каждого угла и тройника */
export function hangers(i: HangerInput): HangerResult {
  const safety = i.safety ?? 1.5;
  const onRuns = Math.ceil(i.lengthM / i.pitchM) + 1;
  const count = onRuns + (i.heavyPoints ?? 0);
  const load = i.weightPerMKg * i.pitchM * safety;

  return {
    count,
    loadPerHangerKg: r2(load, 1),
    trace: [
      {
        what: "Подвесы на прямых участках",
        formula: "n = ⌈L / шаг⌉ + 1",
        substitution: `⌈${i.lengthM} / ${i.pitchM}⌉ + 1`,
        result: `${onRuns} шт`,
      },
      ...(i.heavyPoints
        ? [{ what: "Дополнительно у углов, тройников и тяжёлых элементов", result: `${i.heavyPoints} шт` }]
        : []),
      {
        what: "Расчётная нагрузка на подвес",
        formula: "F = масса пог. м · шаг · k_зап",
        substitution: `${i.weightPerMKg} · ${i.pitchM} · ${safety}`,
        result: `${r2(load, 1)} кг`,
        norm: "выводится в записку для строителей — раздел 7.8 ТЗ",
      },
    ],
  };
}
