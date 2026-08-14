/**
 * Профиль шинопровода KLM-S по номиналу и материалу: сечение, сопротивления,
 * габариты, погонная масса.
 *
 * ИСТОЧНИК: официальный каталог «Шинопроводные системы KLM», редакция V3 от
 * 24.03.2026, стр. 6 (таблица сопротивлений) и стр. 7 (таблица размеров и масс).
 * Это заводские данные, а не отраслевая прикидка: с их появлением заработали
 * расчёт ΔU (ТЗ 7.4) и масса трассы, которые до этого выводились как «требует
 * отдельной проверки».
 *
 * ЕДИНИЦЫ. Каталог даёт сопротивления в мОм/м. Численно мОм/м = Ом/км
 * (1 мОм/м = 1e-3 Ом/м = 1 Ом/км), поэтому значения ниже подставляются
 * в voltageDrop() без пересчёта — там ждут Ом/км.
 *
 * КАКОЕ СОПРОТИВЛЕНИЕ БРАТЬ. Каталог даёт четыре столбца активного:
 *   r     — постоянному току при 20 °C;
 *   Ra    — активное с учётом поверхностного эффекта, 20 °C;
 *   Ra35  — то же при 35 °C;
 *   Ra40  — то же при 40 °C.
 * Для ΔU берётся Ra35: ГОСТ Р МЭК 61439-1 нормирует номинал при среднесуточных
 * 35 °C, и от этой же точки отсчитывается таблица derating в select-busbar.
 * Ra40 — для проверки на максимуме 40 °C.
 */
import type { BusMaterial } from "./klm-catalog";

export const CATALOG_EDITION = "V3";
export const CATALOG_DATE = "2026-03-24";
export const CATALOG_FILE = "4. Шинопровод V3 (24.03.2026).pdf";

/** Габариты и масса одного исполнения (степень защиты × число проводников) */
export type ProfileSize = {
  /** Высота корпуса, мм */
  hMm: number;
  /** Ширина корпуса, мм */
  wMm: number;
  /** Погонная масса 4P (3L+N+PE, PE — корпус), кг/м */
  kgPerM4P: number;
  /** Погонная масса 5P (3L+N+PE), кг/м */
  kgPerM5P: number;
};

export type BusProfile = {
  ratedA: number;
  /** Сечение проводника, мм² */
  areaMm2: number;
  /** r — сопротивление постоянному току, 20 °C, Ом/км */
  rOhmKm: number;
  /** Ra — активное сопротивление, 20 °C, Ом/км */
  raOhmKm: number;
  /** Z — полное сопротивление, Ом/км. Каталожное; сходится с √(Ra² + X²) */
  zOhmKm: number;
  /** X — реактивное сопротивление, Ом/км */
  xOhmKm: number;
  /** r при 35 / 40 °C, Ом/км */
  r35OhmKm: number;
  r40OhmKm: number;
  /** Ra при 35 / 40 °C, Ом/км — рабочие значения для ΔU */
  ra35OhmKm: number;
  ra40OhmKm: number;
  ip55: ProfileSize;
  ip68: ProfileSize;
};

/**
 * Алюминий. Каталог V3, стр. 6 (сопротивления) и стр. 7 (габариты и массы).
 * Порядок столбцов сохранён каталожный, чтобы строку можно было сверить глазами.
 */
export const PROFILES_AL: BusProfile[] = [
  { ratedA:  160, areaMm2:  180, rOhmKm: 0.15556, raOhmKm: 0.16536, zOhmKm: 0.17525, xOhmKm: 0.05813, r35OhmKm: 0.16536, r40OhmKm: 0.16862, ra35OhmKm: 0.21397, ra40OhmKm: 0.2182,
    ip55: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  8.7 }, ip68: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  8.7 } },
  { ratedA:  250, areaMm2:  180, rOhmKm: 0.15556, raOhmKm: 0.16536, zOhmKm: 0.17525, xOhmKm: 0.05813, r35OhmKm: 0.16536, r40OhmKm: 0.16862, ra35OhmKm: 0.21397, ra40OhmKm: 0.2182,
    ip55: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  8.7 }, ip68: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  8.7 } },
  { ratedA:  315, areaMm2:  180, rOhmKm: 0.15556, raOhmKm: 0.16536, zOhmKm: 0.17528, xOhmKm: 0.05813, r35OhmKm: 0.16536, r40OhmKm: 0.16862, ra35OhmKm: 0.21397, ra40OhmKm: 0.2182,
    ip55: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  8.7 }, ip68: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  8.7 } },
  { ratedA:  400, areaMm2:  180, rOhmKm: 0.15556, raOhmKm: 0.16536, zOhmKm: 0.17525, xOhmKm: 0.05813, r35OhmKm: 0.16536, r40OhmKm: 0.16862, ra35OhmKm: 0.21397, ra40OhmKm: 0.2182,
    ip55: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  8.7 }, ip68: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  8.7 } },
  { ratedA:  500, areaMm2:  300, rOhmKm: 0.09333, raOhmKm: 0.09921, zOhmKm: 0.10517, xOhmKm: 0.03488, r35OhmKm: 0.09921, r40OhmKm: 0.10117, ra35OhmKm: 0.12838, ra40OhmKm: 0.1309,
    ip55: { hMm:  79, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  7.5 }, ip68: { hMm:  69, wMm: 140, kgPerM4P:  7.5, kgPerM5P:  9.7 } },
  { ratedA:  630, areaMm2:  300, rOhmKm: 0.09333, raOhmKm: 0.09921, zOhmKm: 0.10517, xOhmKm: 0.03488, r35OhmKm: 0.09921, r40OhmKm: 0.10117, ra35OhmKm: 0.12838, ra40OhmKm: 0.1309,
    ip55: { hMm:  89, wMm: 140, kgPerM4P:  9.4, kgPerM5P: 10.9 }, ip68: { hMm:  89, wMm: 140, kgPerM4P:  9.4, kgPerM5P: 10.9 } },
  { ratedA:  800, areaMm2:  390, rOhmKm: 0.07179, raOhmKm: 0.09290, zOhmKm: 0.09848, xOhmKm: 0.03266, r35OhmKm: 0.07632, r40OhmKm: 0.07783, ra35OhmKm: 0.09876, ra40OhmKm: 0.1007,
    ip55: { hMm: 104, wMm: 140, kgPerM4P: 10.7, kgPerM5P: 12.3 }, ip68: { hMm: 104, wMm: 140, kgPerM4P: 10.7, kgPerM5P: 12.3 } },
  { ratedA: 1000, areaMm2:  600, rOhmKm: 0.04667, raOhmKm: 0.04961, zOhmKm: 0.05258, xOhmKm: 0.01744, r35OhmKm: 0.04961, r40OhmKm: 0.05059, ra35OhmKm: 0.06419, ra40OhmKm: 0.0655,
    ip55: { hMm: 139, wMm: 140, kgPerM4P: 12.9, kgPerM5P: 13.7 }, ip68: { hMm: 139, wMm: 140, kgPerM4P: 12.9, kgPerM5P: 13.7 } },
  { ratedA: 1250, areaMm2:  780, rOhmKm: 0.03590, raOhmKm: 0.03816, zOhmKm: 0.04045, xOhmKm: 0.01342, r35OhmKm: 0.03816, r40OhmKm: 0.03891, ra35OhmKm: 0.04938, ra40OhmKm: 0.0504,
    ip55: { hMm: 169, wMm: 140, kgPerM4P: 15.9, kgPerM5P: 18.8 }, ip68: { hMm: 169, wMm: 140, kgPerM4P: 15.9, kgPerM5P: 18.8 } },
  { ratedA: 1600, areaMm2:  960, rOhmKm: 0.02917, raOhmKm: 0.03100, zOhmKm: 0.03286, xOhmKm: 0.01090, r35OhmKm: 0.03100, r40OhmKm: 0.03162, ra35OhmKm: 0.04012, ra40OhmKm: 0.0409,
    ip55: { hMm: 199, wMm: 140, kgPerM4P: 19.4, kgPerM5P: 23.1 }, ip68: { hMm: 199, wMm: 140, kgPerM4P: 19.4, kgPerM5P: 23.1 } },
  { ratedA: 2000, areaMm2: 1200, rOhmKm: 0.02333, raOhmKm: 0.02480, zOhmKm: 0.02629, xOhmKm: 0.00872, r35OhmKm: 0.02480, r40OhmKm: 0.02529, ra35OhmKm: 0.03210, ra40OhmKm: 0.0327,
    ip55: { hMm: 239, wMm: 140, kgPerM4P: 23.3, kgPerM5P: 27.5 }, ip68: { hMm: 239, wMm: 140, kgPerM4P: 23.3, kgPerM5P: 27.5 } },
  { ratedA: 2500, areaMm2: 1560, rOhmKm: 0.01795, raOhmKm: 0.01908, zOhmKm: 0.02022, xOhmKm: 0.00671, r35OhmKm: 0.01908, r40OhmKm: 0.01946, ra35OhmKm: 0.02469, ra40OhmKm: 0.0252,
    ip55: { hMm: 348, wMm: 140, kgPerM4P: 33.7, kgPerM5P: 39.3 }, ip68: { hMm: 353, wMm: 140, kgPerM4P: 33.7, kgPerM5P: 39.3 } },
  { ratedA: 3200, areaMm2: 1920, rOhmKm: 0.01458, raOhmKm: 0.01550, zOhmKm: 0.01643, xOhmKm: 0.00545, r35OhmKm: 0.01550, r40OhmKm: 0.01581, ra35OhmKm: 0.02006, ra40OhmKm: 0.0205,
    ip55: { hMm: 408, wMm: 140, kgPerM4P: 39.5, kgPerM5P: 46.3 }, ip68: { hMm: 413, wMm: 140, kgPerM4P: 39.5, kgPerM5P: 46.3 } },
  { ratedA: 4000, areaMm2: 2400, rOhmKm: 0.01167, raOhmKm: 0.01240, zOhmKm: 0.01315, xOhmKm: 0.00436, r35OhmKm: 0.01240, r40OhmKm: 0.01265, ra35OhmKm: 0.01605, ra40OhmKm: 0.0164,
    ip55: { hMm: 488, wMm: 140, kgPerM4P: 47.5, kgPerM5P: 55.3 }, ip68: { hMm: 493, wMm: 140, kgPerM4P: 47.5, kgPerM5P: 55.3 } },
  { ratedA: 5000, areaMm2: 3120, rOhmKm: 0.00897, raOhmKm: 0.00954, zOhmKm: 0.01011, xOhmKm: 0.00335, r35OhmKm: 0.00954, r40OhmKm: 0.00973, ra35OhmKm: 0.01234, ra40OhmKm: 0.0126,
    ip55: { hMm: 706, wMm: 140, kgPerM4P: 67.4, kgPerM5P: 77.3 }, ip68: { hMm: 721, wMm: 140, kgPerM4P: 67.4, kgPerM5P: 77.3 } },
  { ratedA: 6300, areaMm2: 3840, rOhmKm: 0.00729, raOhmKm: 0.00775, zOhmKm: 0.00822, xOhmKm: 0.00273, r35OhmKm: 0.00775, r40OhmKm: 0.00790, ra35OhmKm: 0.01003, ra40OhmKm: 0.0102,
    ip55: { hMm: 826, wMm: 140, kgPerM4P: 74.7, kgPerM5P: 90.7 }, ip68: { hMm: 841, wMm: 140, kgPerM4P: 74.7, kgPerM5P: 90.7 } },
];

/**
 * Медь. Каталог V3, стр. 6 и 7.
 *
 * Одна правка против печатного каталога: у меди 315 А IP55 напечатана ширина
 * 170 мм, тогда как в строке IP68 и во всех соседних номиналах — 140 мм.
 * Заказчик 14.08.2026 подтвердил, что это опечатка каталога; здесь стоит 140 мм.
 */
export const PROFILES_CU: BusProfile[] = [
  { ratedA:  160, areaMm2:  180, rOhmKm: 0.09556, raOhmKm: 0.10158, zOhmKm: 0.10767, xOhmKm: 0.03571, r35OhmKm: 0.10158, r40OhmKm: 0.10358, ra35OhmKm: 0.13144, ra40OhmKm: 0.1340,
    ip55: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 20.5 }, ip68: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 20.5 } },
  { ratedA:  250, areaMm2:  180, rOhmKm: 0.09556, raOhmKm: 0.10158, zOhmKm: 0.10767, xOhmKm: 0.03571, r35OhmKm: 0.10158, r40OhmKm: 0.10358, ra35OhmKm: 0.13144, ra40OhmKm: 0.1340,
    ip55: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 20.5 }, ip68: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 20.5 } },
  { ratedA:  315, areaMm2:  180, rOhmKm: 0.09556, raOhmKm: 0.10158, zOhmKm: 0.10767, xOhmKm: 0.03571, r35OhmKm: 0.10158, r40OhmKm: 0.10358, ra35OhmKm: 0.13144, ra40OhmKm: 0.1340,
    ip55: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 20.5 }, ip68: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 20.5 } },
  { ratedA:  400, areaMm2:  180, rOhmKm: 0.09556, raOhmKm: 0.10158, zOhmKm: 0.10767, xOhmKm: 0.03571, r35OhmKm: 0.10158, r40OhmKm: 0.10358, ra35OhmKm: 0.13144, ra40OhmKm: 0.1340,
    ip55: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 20.5 }, ip68: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 20.5 } },
  { ratedA:  500, areaMm2:  180, rOhmKm: 0.09556, raOhmKm: 0.10158, zOhmKm: 0.10767, xOhmKm: 0.03571, r35OhmKm: 0.10158, r40OhmKm: 0.10358, ra35OhmKm: 0.13144, ra40OhmKm: 0.1340,
    ip55: { hMm:  79, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 18.4 }, ip68: { hMm:  69, wMm: 140, kgPerM4P: 18.4, kgPerM5P: 21.5 } },
  { ratedA:  630, areaMm2:  240, rOhmKm: 0.07167, raOhmKm: 0.07618, zOhmKm: 0.08075, xOhmKm: 0.02678, r35OhmKm: 0.07618, r40OhmKm: 0.07769, ra35OhmKm: 0.09858, ra40OhmKm: 0.1005,
    ip55: { hMm:  79, wMm: 140, kgPerM4P: 20.6, kgPerM5P: 23.0 }, ip68: { hMm:  79, wMm: 140, kgPerM4P: 20.6, kgPerM5P: 23.0 } },
  { ratedA:  800, areaMm2:  360, rOhmKm: 0.04778, raOhmKm: 0.06182, zOhmKm: 0.06553, xOhmKm: 0.02174, r35OhmKm: 0.05079, r40OhmKm: 0.05179, ra35OhmKm: 0.06572, ra40OhmKm: 0.0670,
    ip55: { hMm:  99, wMm: 140, kgPerM4P: 20.6, kgPerM5P: 23.0 }, ip68: { hMm:  99, wMm: 140, kgPerM4P: 20.6, kgPerM5P: 23.0 } },
  { ratedA: 1000, areaMm2:  390, rOhmKm: 0.04410, raOhmKm: 0.04688, zOhmKm: 0.04969, xOhmKm: 0.01648, r35OhmKm: 0.04688, r40OhmKm: 0.04781, ra35OhmKm: 0.06066, ra40OhmKm: 0.0619,
    ip55: { hMm: 104, wMm: 140, kgPerM4P: 22.6, kgPerM5P: 25.6 }, ip68: { hMm: 104, wMm: 140, kgPerM4P: 22.6, kgPerM5P: 25.6 } },
  { ratedA: 1250, areaMm2:  480, rOhmKm: 0.03583, raOhmKm: 0.03809, zOhmKm: 0.04038, xOhmKm: 0.01339, r35OhmKm: 0.03809, r40OhmKm: 0.03884, ra35OhmKm: 0.04929, ra40OhmKm: 0.0503,
    ip55: { hMm: 119, wMm: 140, kgPerM4P: 25.6, kgPerM5P: 28.6 }, ip68: { hMm: 119, wMm: 140, kgPerM4P: 25.6, kgPerM5P: 28.6 } },
  { ratedA: 1600, areaMm2:  600, rOhmKm: 0.02867, raOhmKm: 0.03047, zOhmKm: 0.03230, xOhmKm: 0.01071, r35OhmKm: 0.03047, r40OhmKm: 0.03107, ra35OhmKm: 0.03943, ra40OhmKm: 0.0402,
    ip55: { hMm: 139, wMm: 140, kgPerM4P: 30.9, kgPerM5P: 36.9 }, ip68: { hMm: 139, wMm: 140, kgPerM4P: 30.9, kgPerM5P: 36.9 } },
  { ratedA: 2000, areaMm2:  960, rOhmKm: 0.01792, raOhmKm: 0.01905, zOhmKm: 0.02019, xOhmKm: 0.00670, r35OhmKm: 0.01905, r40OhmKm: 0.01942, ra35OhmKm: 0.02464, ra40OhmKm: 0.0251,
    ip55: { hMm: 199, wMm: 140, kgPerM4P: 38.8, kgPerM5P: 46.8 }, ip68: { hMm: 199, wMm: 140, kgPerM4P: 38.8, kgPerM5P: 46.8 } },
  { ratedA: 2500, areaMm2: 1200, rOhmKm: 0.01433, raOhmKm: 0.01524, zOhmKm: 0.01615, xOhmKm: 0.00536, r35OhmKm: 0.01524, r40OhmKm: 0.01554, ra35OhmKm: 0.01972, ra40OhmKm: 0.0201,
    ip55: { hMm: 239, wMm: 140, kgPerM4P: 46.6, kgPerM5P: 49.8 }, ip68: { hMm: 239, wMm: 140, kgPerM4P: 46.6, kgPerM5P: 49.8 } },
  { ratedA: 3200, areaMm2: 1560, rOhmKm: 0.01103, raOhmKm: 0.01172, zOhmKm: 0.01242, xOhmKm: 0.00412, r35OhmKm: 0.01172, r40OhmKm: 0.01195, ra35OhmKm: 0.01517, ra40OhmKm: 0.0155,
    ip55: { hMm: 348, wMm: 140, kgPerM4P: 62.6, kgPerM5P: 74.8 }, ip68: { hMm: 348, wMm: 140, kgPerM4P: 62.6, kgPerM5P: 74.8 } },
  { ratedA: 4000, areaMm2: 1920, rOhmKm: 0.00896, raOhmKm: 0.00952, zOhmKm: 0.01009, xOhmKm: 0.00335, r35OhmKm: 0.00952, r40OhmKm: 0.00971, ra35OhmKm: 0.01232, ra40OhmKm: 0.0126,
    ip55: { hMm: 408, wMm: 140, kgPerM4P: 93.9, kgPerM5P: 114.7 }, ip68: { hMm: 408, wMm: 140, kgPerM4P: 93.9, kgPerM5P: 114.7 } },
  { ratedA: 5000, areaMm2: 2400, rOhmKm: 0.00717, raOhmKm: 0.00762, zOhmKm: 0.00808, xOhmKm: 0.00268, r35OhmKm: 0.00762, r40OhmKm: 0.00777, ra35OhmKm: 0.00986, ra40OhmKm: 0.0101,
    ip55: { hMm: 488, wMm: 140, kgPerM4P: 124.6, kgPerM5P: 152.6 }, ip68: { hMm: 488, wMm: 140, kgPerM4P: 124.6, kgPerM5P: 152.6 } },
  { ratedA: 6300, areaMm2: 3600, rOhmKm: 0.00478, raOhmKm: 0.00508, zOhmKm: 0.00538, xOhmKm: 0.00179, r35OhmKm: 0.00508, r40OhmKm: 0.00518, ra35OhmKm: 0.00657, ra40OhmKm: 0.0067,
    ip55: { hMm: 737, wMm: 140, kgPerM4P: 156.1, kgPerM5P: 168.1 }, ip68: { hMm: 737, wMm: 140, kgPerM4P: 156.1, kgPerM5P: 168.1 } },
];

export const PROFILES: Record<BusMaterial, BusProfile[]> = { Al: PROFILES_AL, Cu: PROFILES_CU };

/** Ряд номиналов KLM-S по каталогу V3 — единый для алюминия и меди */
export const RATED_SERIES = PROFILES_AL.map((p) => p.ratedA);

/** Профиль по материалу и номиналу; null — номинала нет в ряду каталога */
export const profileFor = (material: BusMaterial, ratedA: number | null): BusProfile | null =>
  ratedA == null ? null : (PROFILES[material].find((p) => p.ratedA === ratedA) ?? null);

/** Габариты и масса нужного исполнения. IP выше 55 обслуживается строкой IP68 */
export const sizeFor = (p: BusProfile, ip: number): ProfileSize => (ip > 55 ? p.ip68 : p.ip55);

/** Погонная масса, кг/м, с учётом числа проводников */
export const massPerM = (p: BusProfile, ip: number, poles: number): number => {
  const size = sizeFor(p, ip);
  return poles >= 5 ? size.kgPerM5P : size.kgPerM4P;
};

/**
 * Рабочее активное сопротивление для расчёта ΔU, Ом/км.
 * 40 °C — верх диапазона по ГОСТ Р МЭК 61439-1, 35 °C — среднесуточная норма.
 */
export const activeResistance = (p: BusProfile, ambientC: number): number =>
  ambientC > 35 ? p.ra40OhmKm : p.ra35OhmKm;
