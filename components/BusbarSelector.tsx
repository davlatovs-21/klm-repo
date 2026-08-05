"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { COMPANY, IP_ENV, OBJECTS, SERIES, TAP_BOXES, src, type BusMaterial } from "@/lib/klm-catalog";
import { DEFAULT_INPUT, DUTIES, PRESETS, VOLTAGES, selectBusbar, type Input } from "@/lib/select-busbar";
import { Opt, Row } from "./ui";
import { IconAlert, IconBolt, IconBus, IconCheck, IconLink, IconShield, IconTap } from "./icons";

const fmt = (n: number) => n.toLocaleString("ru-RU");

function Num({
  label,
  unit,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="flex min-w-[132px] flex-1 flex-col gap-1">
      <span className="text-[11.5px] font-semibold text-mute">{label}</span>
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
    </label>
  );
}

export default function BusbarSelector() {
  const [s, setS] = useState<Input>(DEFAULT_INPUT);
  const set = <K extends keyof Input>(k: K, v: Input[K]) => setS((p) => ({ ...p, [k]: v }));

  const r = useMemo(() => selectBusbar(s), [s]);
  const errors = r.checks.filter((c) => c.level === "error");
  const hasTaps = r.series.tapMaxA != null;
  const volts = VOLTAGES[s.duty];

  /** Смена задачи: отводы и напряжение приводим к возможностям новой серии */
  const setDuty = (duty: Input["duty"]) =>
    setS((p) => {
      const target = SERIES.find((x) => x.duty === duty)!;
      const allowed = VOLTAGES[duty];
      return {
        ...p,
        duty,
        voltageV: allowed.includes(p.voltageV) ? p.voltageV : allowed[0],
        taps: target.tapMaxA == null ? [] : p.taps,
      };
    });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-5">
      {/* сценарии */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] tracking-wide text-mute">Сценарии:</span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => setS(p.input)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-px hover:border-cur hover:text-cur-d"
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* ── ввод ─────────────────────────────────────────── */}
        <div className="rounded-xl2 border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <IconBus className="h-4 w-4 text-cur-d" />
            <h2 className="display text-[17px]">Задача трассы</h2>
          </div>
          <p className="mb-3 mt-1 text-[13px] text-mute">Что шинопровод должен делать — от этого зависит серия</p>

          <div className="grid gap-1.5 sm:grid-cols-2">
            {DUTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDuty(d.key)}
                aria-pressed={s.duty === d.key}
                className={`rounded-xl border-[1.5px] p-3 text-left transition-all duration-200 ${
                  s.duty === d.key
                    ? "border-ink bg-ink text-white shadow-[0_8px_18px_-10px_rgba(11,26,33,0.7)]"
                    : "border-line bg-surface hover:-translate-y-px hover:border-cur"
                }`}
              >
                <span className="block text-[13.5px] font-bold">{d.label}</span>
                <span className={`mt-0.5 block text-[11px] leading-snug ${s.duty === d.key ? "text-[#8fb4c0]" : "text-mute"}`}>
                  {d.desc}
                </span>
              </button>
            ))}
          </div>

          <Row label="Тип объекта" hint="подставляет типовые параметры и ведёт на готовое решение КЛМ">
            {OBJECTS.map((o) => (
              <Opt
                key={o.key}
                onClick={() =>
                  setDuty(o.key === "crane" ? "mobile" : o.key === "substation" ? "mv" : s.duty === "mv" ? "main" : s.duty)
                }
                sub={o.hint}
              >
                {o.label}
              </Opt>
            ))}
          </Row>

          <div className="mt-5 flex items-center gap-2">
            <IconBolt className="h-4 w-4 text-cur-d" />
            <h2 className="display text-[17px]">Нагрузка</h2>
          </div>

          <Row label="Исходные данные">
            <Opt on={s.mode === "power"} onClick={() => set("mode", "power")} sub="кВт, cosφ">
              Мощность
            </Opt>
            <Opt on={s.mode === "current"} onClick={() => set("mode", "current")} sub="из расчёта проекта">
              Ток
            </Opt>
          </Row>

          <div className="flex flex-wrap gap-2 border-t border-line py-3.5">
            {s.mode === "power" ? (
              <>
                <Num label="Мощность нагрузки" unit="кВт" value={s.powerKW} onChange={(v) => set("powerKW", v)} step={10} />
                <Num label="cos φ" unit="" value={s.cosPhi} onChange={(v) => set("cosPhi", v)} step={0.01} />
              </>
            ) : (
              <Num label="Расчётный ток" unit="А" value={s.currentA} onChange={(v) => set("currentA", v)} step={10} />
            )}
            <Num label="Коэф. одновременности" unit="Kс" value={s.demand} onChange={(v) => set("demand", v)} step={0.05} />
            <Num label="Температура среды" unit="°C" value={s.ambientC} onChange={(v) => set("ambientC", v)} step={5} />
            <Num label="Длина трассы" unit="м" value={s.routeLenM} onChange={(v) => set("routeLenM", v)} step={5} />
          </div>

          <Row label="Напряжение">
            {volts.map((v) => (
              <Opt key={v} on={s.voltageV === v} onClick={() => set("voltageV", v)}>
                {v >= 1000 && s.duty === "mv" ? `${v / 1000} кВ` : `${v} В`}
              </Opt>
            ))}
          </Row>

          <div className="mt-5 flex items-center gap-2">
            <IconShield className="h-4 w-4 text-cur-d" />
            <h2 className="display text-[17px]">Условия эксплуатации</h2>
          </div>

          <Row label="Среда" hint="определяет степень защиты корпуса">
            {IP_ENV.map((e) => (
              <Opt key={e.key} on={s.env === e.key} onClick={() => set("env", e.key)} sub={`IP${e.ip} · ${e.hint}`}>
                {e.label}
              </Opt>
            ))}
          </Row>

          <Row label="Материал шин" hint="алюминий дешевле, медь компактнее при том же токе">
            {(["any", "Al", "Cu"] as const).map((m) => (
              <Opt
                key={m}
                on={s.material === m}
                off={m !== "any" && !r.series.materials.includes(m as BusMaterial)}
                onClick={() => set("material", m)}
              >
                {m === "any" ? "Любой" : m}
              </Opt>
            ))}
          </Row>

          <Row label="Огнестойкость" hint="для путей эвакуации и систем противопожарной защиты">
            {([0, 60, 120] as const).map((f) => (
              <Opt key={f} on={s.fireE === f} onClick={() => set("fireE", f)}>
                {f === 0 ? "Не требуется" : `E${f}`}
              </Opt>
            ))}
          </Row>

          {hasTaps && (
            <>
              <div className="mt-5 flex items-center gap-2">
                <IconTap className="h-4 w-4 text-cur-d" />
                <h2 className="display text-[17px]">Отводы</h2>
              </div>
              <p className="mb-3 mt-1 text-[13px] text-mute">
                Коробки отбора мощности на трассе. До {r.series.tapMaxA} А — в стандартное окно с шагом{" "}
                {r.series.tapPitchM.join(" / ")} м
              </p>

              <Row label="Добавить отвод" hint="нажмите номинал нагрузки, которую нужно снять с трассы">
                {TAP_BOXES.map((a) => (
                  <Opt key={a} onClick={() => set("taps", [...s.taps, a])}>
                    +{a} А
                  </Opt>
                ))}
              </Row>

              <div className="flex flex-wrap items-center gap-1.5 border-t border-line py-3.5">
                {s.taps.length === 0 && <span className="text-[13px] text-mute">Отводов пока нет</span>}
                {s.taps.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => set("taps", s.taps.filter((_, j) => j !== i))}
                    className="group flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[12.5px] font-bold transition-colors hover:border-fault hover:text-fault"
                  >
                    {a} А
                    <span className="text-mute transition-colors group-hover:text-fault">×</span>
                  </button>
                ))}
                {s.taps.length > 0 && (
                  <button
                    onClick={() => set("taps", [])}
                    className="ml-1 text-[12px] font-semibold text-mute underline decoration-dashed underline-offset-4 hover:text-fault"
                  >
                    очистить
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── результат ────────────────────────────────────── */}
        <div className="lg:sticky lg:top-20">
          <div className="busgrid overflow-hidden rounded-xl2 bg-ink p-5 text-white">
            <p className="eyebrow text-[#8fb4c0]">{errors.length ? "Конфигурация не проходит" : "Подобрано"}</p>
            <p className="display mt-2 text-[clamp(22px,4.6vw,30px)]">
              {r.series.name}
              {r.ratedA != null && <span className="text-cur"> · {fmt(r.ratedA)} А</span>}
            </p>
            <p className="mt-1 text-[12.5px] text-[#8fb4c0]">{r.series.title}</p>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/10 pt-4 text-[12.5px]">
              {[
                ["Расчётный ток", `${fmt(r.loadA)} А`],
                ["С поправкой на T", `${fmt(r.requiredA)} А`],
                ["Запас по току", r.ratedA != null ? `${r.reservePct} %` : "—"],
                ["Материал шин", r.material],
                ["Степень защиты", `IP${r.ip}`],
                ["Секций трассы", `${r.sections} × ${r.series.sectionLenMm[1] / 1000} м`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[#8fb4c0]">{k}</dt>
                  <dd className="font-mono text-[13.5px] font-bold">{v}</dd>
                </div>
              ))}
            </dl>

            <a
              href={r.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3.5 text-[12.5px] font-semibold text-cur hover:underline"
            >
              <IconLink className="h-3.5 w-3.5" />
              Страница серии на сайте КЛМ
            </a>
          </div>

          {/* проверки */}
          <div className="mt-4 rounded-xl2 border border-line bg-surface p-4">
            <h3 className="eyebrow text-mute">Проверки ({r.checks.length})</h3>
            {r.checks.length === 0 && (
              <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-cur-d">
                <IconCheck className="h-4 w-4" />
                Конфигурация допустима
              </p>
            )}
            <ul>
              {r.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 border-t border-line py-2.5 first:border-0 first:pt-2">
                  <span
                    className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full ${
                      c.level === "error" ? "bg-fault-soft text-fault" : c.level === "warn" ? "bg-cur-soft text-cur-d" : "bg-bg text-mute"
                    }`}
                  >
                    {c.level === "info" ? <IconCheck className="h-3 w-3" /> : <IconAlert className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-snug">{c.text}</span>
                    {c.fix && <span className="mt-0.5 block text-[11.5px] leading-snug text-mute">{c.fix}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* КОМ */}
          {hasTaps && r.tapBoxes.length > 0 && (
            <div className="mt-4 rounded-xl2 border border-line bg-surface p-4">
              <h3 className="eyebrow text-mute">Коробки отбора мощности</h3>
              <table className="mt-2 w-full border-collapse text-[13px]">
                <tbody>
                  {r.tapBoxes.map((t, i) => (
                    <tr key={i}>
                      <td className="border-t border-line py-2 text-mute">{t.requestedA} А нагрузка</td>
                      <td className="border-t border-line py-2 pl-2 text-right font-mono text-[12.5px] font-bold">
                        {t.boxA != null ? `КОМ ${t.boxA} А` : "нет в ряду"}
                        {t.viaSection && <span className="ml-1 font-sans text-[10.5px] font-semibold text-cur-d">секция отбора</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link
                href="/demo"
                className="mt-3 flex items-center justify-center rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5"
              >
                Собрать код заказа КОМ →
              </Link>
            </div>
          )}

          {/* связь */}
          <div className="mt-4 rounded-xl2 border border-dashed border-line-2 p-4 text-[12.5px] text-mute">
            <p className="font-semibold text-ink">Проверить подбор у инженера</p>
            <p className="mt-1 leading-snug">
              {COMPANY.name} · реестр Минпромторга №{COMPANY.registry}
            </p>
            <p className="mt-2 font-mono text-[12.5px] font-bold text-ink">{COMPANY.phone}</p>
            <a href={`mailto:${COMPANY.email}`} className="font-mono text-[12.5px] text-cur-d hover:underline">
              {COMPANY.email}
            </a>
            <p className="mt-1">{COMPANY.hours}</p>
            <a href={src("/request")} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-cur-d hover:underline">
              Отправить ТЗ на сайте КЛМ →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
