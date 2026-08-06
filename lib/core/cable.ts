/**
 * Сравнение «шинопровод против кабеля» — раздел 7.5 ТЗ.
 *
 * ТЗ утверждает, что экран «полностью считается из уже имеющихся данных». Это не так:
 * потери шинопровода требуют R по номиналу, которого у КЛМ пока нет, а капитальные
 * затраты — прайса. Поэтому здесь считается ровно то, что считается честно:
 *
 *   — кабельная часть целиком: подбор сечения по ПУЭ, R = ρ·L/S, потери, масса металла;
 *   — шинопроводная часть по R, который подставляет пользователь (ячейка опросного
 *     листа `data/etap-0/02-elektricheskie-harakteristiki.csv`);
 *   — капитальные затраты НЕ считаются и помечены как требующие прайса.
 */

export type Conductor = "Cu" | "Al";

/**
 * Допустимый длительный ток трёхжильных кабелей при прокладке в воздухе.
 * ПУЭ, таблица 1.3.6 (медь) и 1.3.7 (алюминий).
 * Ряд оборван на 185 мм² сознательно: выше проектировщик всё равно уходит
 * на несколько кабелей в параллель, а значения 240 мм² в таблице не подтверждены.
 */
export const CABLE_AMPACITY: Record<Conductor, [number, number][]> = {
  Cu: [
    [1.5, 19], [2.5, 25], [4, 35], [6, 42], [10, 55], [16, 75], [25, 95],
    [35, 120], [50, 145], [70, 180], [95, 220], [120, 260], [150, 305], [185, 350],
  ],
  Al: [
    [2.5, 19], [4, 27], [6, 32], [10, 42], [16, 60], [25, 75],
    [35, 90], [50, 110], [70, 140], [95, 170], [120, 200], [150, 235], [185, 270],
  ],
};

/**
 * Удельное сопротивление для расчётов, Ом·мм²/м.
 * Взяты практические значения через удельную проводимость (γ_Cu = 53, γ_Al = 31,7 м/Ом·мм²):
 * они учитывают, что действительное сечение жилы отличается от номинального.
 * Физические при 20 °C — 0,0175 и 0,028. Сопротивление жил нормирует ГОСТ 22483-2021.
 */
export const RHO: Record<Conductor, number> = { Cu: 1 / 53, Al: 1 / 31.7 };

/** Плотность, кг/м³ — для массы металла в трассе */
export const DENSITY: Record<Conductor, number> = { Cu: 8960, Al: 2700 };

export type CableChoice = {
  conductor: Conductor;
  /** Сечение одной жилы, мм² */
  sectionMm2: number;
  /** Сколько трёхжильных кабелей в параллель */
  runs: number;
  /** Допустимый ток одного кабеля, А */
  ampacityPerRunA: number;
  /** Суммарный допустимый ток, А */
  ampacityTotalA: number;
  /** Эффективное сопротивление трассы с учётом параллельных кабелей, Ом/км */
  rOhmKm: number;
  /** Масса металла жил на всю трассу, кг */
  conductorMassKg: number;
  label: string;
};

/**
 * Подбор кабеля под ток: берём максимальное сечение ряда и добираем число кабелей
 * в параллель. Это то, как поступает проектировщик на больших токах, и именно это
 * делает сравнение с шинопроводом наглядным.
 */
export function selectCable(currentA: number, lengthM: number, conductor: Conductor): CableChoice {
  const table = CABLE_AMPACITY[conductor];
  const single = table.find(([, i]) => i >= currentA);

  const [sectionMm2, ampacityPerRunA] = single ?? table[table.length - 1];
  const runs = single ? 1 : Math.ceil(currentA / ampacityPerRunA);

  // R одного кабеля на км, делённое на число параллельных: R_эф = ρ·1000 / S / runs
  const rOhmKm = (RHO[conductor] * 1000) / sectionMm2 / runs;
  // три жилы на кабель; объём = S[мм²]·L[м]·1e-6 м³
  const conductorMassKg = 3 * runs * sectionMm2 * lengthM * 1e-6 * DENSITY[conductor];

  return {
    conductor,
    sectionMm2,
    runs,
    ampacityPerRunA,
    ampacityTotalA: ampacityPerRunA * runs,
    rOhmKm: Number(rOhmKm.toFixed(5)),
    conductorMassKg: Number(conductorMassKg.toFixed(1)),
    label: `${runs > 1 ? `${runs} × ` : ""}кабель 3×${sectionMm2} мм² ${conductor}`,
  };
}

export type CompareInput = {
  currentA: number;
  lengthM: number;
  conductor: Conductor;
  /** R шинопровода, Ом/км — из опросного листа КЛМ. null: потери не считаются */
  busbarROhmKm: number | null;
  /** Масса погонного метра шинопровода, кг — оттуда же */
  busbarWeightPerMKg?: number | null;
  /** Часов использования максимума в год */
  hoursPerYear: number;
  tariffPerKWh: number;
  years: number;
};

export type Side = {
  label: string;
  rOhmKm: number;
  deltaP_kW: number;
  energyPerYear_kWh: number;
  costLifetime: number;
  metalMassKg: number | null;
};

export type CompareResult = {
  cable: Side;
  busbar: Side | null;
  /** Экономия шинопровода на потерях за срок службы, ₽; null — нет R */
  savingLifetime: number | null;
  /** Во сколько раз потери кабеля выше */
  lossRatio: number | null;
  cableChoice: CableChoice;
  notes: string[];
};

const lossKW = (currentA: number, rOhmKm: number, lengthM: number) =>
  Number(((3 * currentA ** 2 * rOhmKm * (lengthM / 1000)) / 1000).toFixed(3));

export function compareWithCable(i: CompareInput): CompareResult {
  const choice = selectCable(i.currentA, i.lengthM, i.conductor);

  const side = (label: string, rOhmKm: number, metalMassKg: number | null): Side => {
    const deltaP = lossKW(i.currentA, rOhmKm, i.lengthM);
    const energy = Number((deltaP * i.hoursPerYear).toFixed(0));
    return {
      label,
      rOhmKm,
      deltaP_kW: deltaP,
      energyPerYear_kWh: energy,
      costLifetime: Number((energy * i.tariffPerKWh * i.years).toFixed(0)),
      metalMassKg,
    };
  };

  const cable = side(choice.label, choice.rOhmKm, choice.conductorMassKg);
  const busbar =
    i.busbarROhmKm != null
      ? side(
          "Шинопровод КЛМ",
          i.busbarROhmKm,
          i.busbarWeightPerMKg != null ? Number((i.busbarWeightPerMKg * i.lengthM).toFixed(1)) : null,
        )
      : null;

  const notes: string[] = [];
  if (busbar == null)
    notes.push(
      "Потери шинопровода не посчитаны: нужно R (Ом/км) по выбранному номиналу — ячейка опросного листа 02-elektricheskie-harakteristiki.csv.",
    );
  notes.push("Капитальные затраты (материал, монтаж, лотки, кабельные муфты) не считаются — нужен прайс КЛМ и расценки на монтаж.");
  if (choice.runs > 1)
    notes.push(
      `Ток ${i.currentA} А не проходит одним кабелем: ряд ПУЭ заканчивается на ${choice.sectionMm2} мм² (${choice.ampacityPerRunA} А). Нужно ${choice.runs} кабеля в параллель — это ${choice.runs} трасс лотков, ${choice.runs * 3} жил на каждом соединении и ${choice.runs}-кратный монтаж.`,
    );
  notes.push("Расширение: отвод в шинопровод — коробка отбора в готовое окно под напряжением магистрали. Врезка в кабельную линию — проект, отключение, муфты.");

  return {
    cable,
    busbar,
    savingLifetime: busbar ? Number((cable.costLifetime - busbar.costLifetime).toFixed(0)) : null,
    lossRatio: busbar && busbar.deltaP_kW > 0 ? Number((cable.deltaP_kW / busbar.deltaP_kW).toFixed(2)) : null,
    cableChoice: choice,
    notes,
  };
}
