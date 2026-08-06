"use client";

import { useMemo, useState } from "react";
import { compareWithCable, type Conductor } from "@/lib/core/cable";
import { Opt, Row } from "./ui";
import { IconAlert, IconBolt, IconCheck } from "./icons";

const fmt = (n: number) => n.toLocaleString("ru-RU");
const money = (n: number) => `${fmt(Math.round(n))} ₽`;
const mass = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(2)} т` : `${fmt(Math.round(kg))} кг`);

function Num({
  label, unit, value, onChange, step = 1, min = 0, hint,
}: {
  label: string; unit: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-semibold leading-tight text-mute">{label}</span>
      <span className="flex items-baseline gap-1.5 rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 focus-within:border-cur">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent font-mono text-[14px] font-bold outline-none"
        />
        <span className="flex-none font-mono text-[11px] text-mute">{unit}</span>
      </span>
      {hint && <span className="text-[10.5px] leading-snug text-mute">{hint}</span>}
    </label>
  );
}

export default function CableCompare() {
  const [currentA, setCurrentA] = useState(1250);
  const [lengthM, setLengthM] = useState(120);
  const [conductor, setConductor] = useState<Conductor>("Cu");
  const [hoursPerYear, setHoursPerYear] = useState(4000);
  const [tariff, setTariff] = useState(6);
  const [years, setYears] = useState(25);
  /** R шинопровода: 0 = не задано, потери шинопровода не считаются */
  const [busbarR, setBusbarR] = useState(0);
  const [busbarWeight, setBusbarWeight] = useState(0);

  const r = useMemo(
    () =>
      compareWithCable({
        currentA, lengthM, conductor, hoursPerYear, tariffPerKWh: tariff, years,
        busbarROhmKm: busbarR > 0 ? busbarR : null,
        busbarWeightPerMKg: busbarWeight > 0 ? busbarWeight : null,
      }),
    [currentA, lengthM, conductor, hoursPerYear, tariff, years, busbarR, busbarWeight],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-20 sm:px-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* ── ввод ────────────────────────────────────────────── */}
        <div className="rounded-xl2 border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <IconBolt className="h-4 w-4 text-cur-d" />
            <h2 className="display text-[17px]">Трасса</h2>
          </div>

          <div className="mt-3 grid grid-cols-2 items-end gap-2 sm:grid-cols-3">
            <Num label="Расчётный ток" unit="А" value={currentA} onChange={setCurrentA} step={50} />
            <Num label="Длина трассы" unit="м" value={lengthM} onChange={setLengthM} step={10} />
          </div>

          <Row label="Материал жил кабеля" hint="ряд допустимых токов — ПУЭ, табл. 1.3.6 и 1.3.7">
            {(["Cu", "Al"] as Conductor[]).map((c) => (
              <Opt key={c} on={conductor === c} sub={c === "Cu" ? "медь" : "алюминий"} onClick={() => setConductor(c)}>
                {c}
              </Opt>
            ))}
          </Row>

          <div className="mt-5 flex items-center gap-2">
            <IconBolt className="h-4 w-4 text-cur-d" />
            <h2 className="display text-[17px]">Экономика потерь</h2>
          </div>

          <div className="mt-3 grid grid-cols-2 items-end gap-2 sm:grid-cols-3">
            <Num label="Часов максимума в год" unit="ч" value={hoursPerYear} onChange={setHoursPerYear} step={500} hint="T_макс: ЦОД до 8000, цех 3000–5000" />
            <Num label="Тариф" unit="₽/кВт·ч" value={tariff} onChange={setTariff} step={0.5} />
            <Num label="Срок службы" unit="лет" value={years} onChange={setYears} step={5} />
          </div>

          <div className="mt-5 rounded-xl2 border border-dashed border-line-2 bg-bg p-4">
            <div className="flex items-center gap-2">
              <IconAlert className="h-4 w-4 text-copper" />
              <h3 className="text-[13.5px] font-bold">Характеристики шинопровода</h3>
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-mute">
              В публичном каталоге КЛМ этих значений нет. Подставьте из опросного листа
              (<span className="font-mono">data/etap-0/02-elektricheskie-harakteristiki.csv</span>) — тогда
              посчитается и сторона шинопровода. Пока поля нулевые, сравнение показывает только кабель.
            </p>
            <div className="mt-3 grid grid-cols-2 items-end gap-2">
              <Num label="R шинопровода" unit="Ом/км" value={busbarR} onChange={setBusbarR} step={0.005} />
              <Num label="Масса пог. метра" unit="кг/м" value={busbarWeight} onChange={setBusbarWeight} step={1} />
            </div>
          </div>
        </div>

        {/* ── результат ───────────────────────────────────────── */}
        <div className="lg:sticky lg:top-20">
          <div className="busgrid overflow-hidden rounded-xl2 bg-ink p-5 text-white">
            <p className="eyebrow text-[#8fb4c0]">Кабельная альтернатива</p>
            <p className="display mt-2 text-[clamp(20px,4.2vw,26px)]">{r.cableChoice.label}</p>
            <p className="mt-1 text-[12.5px] text-[#8fb4c0]">
              допустимый ток {fmt(r.cableChoice.ampacityTotalA)} А при расчётных {fmt(currentA)} А
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/10 pt-4 text-[12.5px]">
              {[
                ["Сопротивление трассы", `${r.cable.rOhmKm} Ом/км`],
                ["Потери мощности", `${fmt(r.cable.deltaP_kW)} кВт`],
                ["Потери за год", `${fmt(r.cable.energyPerYear_kWh)} кВт·ч`],
                [`Стоимость потерь за ${years} лет`, money(r.cable.costLifetime)],
                ["Металл жил в трассе", mass(r.cableChoice.conductorMassKg)],
                ["Число кабелей", `${r.cableChoice.runs} шт`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[#8fb4c0]">{k}</dt>
                  <dd className="font-mono text-[13.5px] font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* сравнение */}
          <div className="mt-4 rounded-xl2 border border-line bg-surface p-4">
            <h3 className="eyebrow text-mute">Шинопровод против кабеля</h3>
            {r.busbar ? (
              <>
                <table className="mt-2 w-full border-collapse text-[13px]">
                  <tbody>
                    {[
                      ["Потери мощности, кВт", fmt(r.busbar.deltaP_kW), fmt(r.cable.deltaP_kW)],
                      ["Потери за год, кВт·ч", fmt(r.busbar.energyPerYear_kWh), fmt(r.cable.energyPerYear_kWh)],
                      [`Стоимость потерь, ${years} лет`, money(r.busbar.costLifetime), money(r.cable.costLifetime)],
                      [
                        "Металл в трассе",
                        r.busbar.metalMassKg != null ? mass(r.busbar.metalMassKg) : "—",
                        mass(r.cableChoice.conductorMassKg),
                      ],
                    ].map(([k, bus, cab]) => (
                      <tr key={k}>
                        <td className="border-t border-line py-2 pr-2 text-[12px] text-mute">{k}</td>
                        <td className="border-t border-line py-2 text-right font-mono text-[12.5px] font-bold text-cur-d">{bus}</td>
                        <td className="border-t border-line py-2 pl-3 text-right font-mono text-[12.5px] font-bold">{cab}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex items-start gap-2.5 rounded-[14px] bg-cur-soft px-3.5 py-3 text-[13px] font-semibold text-cur-d">
                  <IconCheck className="mt-0.5 h-4 w-4 flex-none" />
                  <span>
                    Шинопровод экономит {money(r.savingLifetime!)} на потерях за {years} лет.
                    {r.lossRatio! > 1 && ` Потери кабеля выше в ${r.lossRatio!.toFixed(1)} раза.`}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 flex items-start gap-2 text-[13px] leading-snug text-mute">
                <IconAlert className="mt-0.5 h-4 w-4 flex-none text-copper" />
                Задайте R шинопровода слева — без него сторона шинопровода не считается.
                Придумывать сопротивление под красивую картинку нельзя: это число уходит в расчётную записку.
              </p>
            )}
          </div>

          {/* оговорки */}
          <ul className="mt-4 rounded-xl2 border border-line bg-bg p-4">
            {r.notes.map((n) => (
              <li key={n} className="relative border-t border-line py-2 pl-5 text-[12px] leading-snug text-ink-2 first:border-0 first:pt-0">
                <span className="absolute left-0 top-[13px] h-1.5 w-1.5 rounded-full bg-copper opacity-70 first:top-[9px]" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
