"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IP_ENV, OBJECTS, TAP_BOXES, src } from "@/lib/core/klm-catalog";
import {
  DUTIES, MOUNT_FACTOR, MOUNT_LABEL, VOLTAGES, selectBusbar, type Input,
} from "@/lib/core/select-busbar";
import { encodeInput } from "@/lib/core/calc-url";
import LeadForm, { type LeadContext } from "./LeadForm";
import { Opt, Row } from "./ui";
import { IconAlert, IconBolt, IconBus, IconCheck, IconGauge, IconLink, IconShield, IconTap } from "./icons";

const STEPS = ["Объект", "Нагрузка", "Условия", "Результат"] as const;
const STEP_ICONS = [IconBus, IconBolt, IconShield, IconGauge];
const fmt = (n: number) => n.toLocaleString("ru-RU");

/** Тип объекта задаёт задачу трассы и разумные значения по умолчанию (M1.2) */
const OBJECT_PRESET: Record<string, Partial<Input>> = {
  datacenter: { duty: "main", powerKW: 2500, demand: 0.9, env: "dry", fireE: 120, routeLenM: 120 },
  factory: { duty: "main", powerKW: 1200, demand: 0.8, env: "dusty", routeLenM: 90 },
  mall: { duty: "main", powerKW: 900, demand: 0.7, env: "dry", routeLenM: 80 },
  residential: { duty: "main", powerKW: 600, demand: 0.7, env: "dry", routeLenM: 60 },
  airport: { duty: "main", powerKW: 2000, demand: 0.8, env: "dry", routeLenM: 150 },
  crane: { duty: "mobile", mode: "current", currentA: 200, env: "dusty", routeLenM: 40 },
  substation: { duty: "mv", mode: "current", currentA: 4000, voltageV: 10000, env: "outdoor", routeLenM: 30 },
  oilgas: { duty: "main", powerKW: 1000, demand: 0.8, env: "outdoor", routeLenM: 100 },
};

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
          enterKeyHint="next"
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

/**
 * Исходные данные разбирает серверный компонент и передаёт сюда: тогда ссылка,
 * присланная коллеге, отрисовывается на сервере вместе с результатом (M1.9),
 * а не «догоняется» после гидратации.
 */
export default function CalcWizard({
  initial, initialStep, utm, dealer, embedded = false,
}: {
  initial: Input;
  initialStep: number;
  utm: Record<string, string>;
  dealer?: string;
  embedded?: boolean;
}) {
  const [s, setS] = useState<Input>(initial);
  const [step, setStep] = useState(initialStep);
  const [objectKey, setObjectKey] = useState<string | null>(null);

  const set = <K extends keyof Input>(k: K, v: Input[K]) => setS((p) => ({ ...p, [k]: v }));
  const r = useMemo(() => selectBusbar(s), [s]);
  const errors = r.checks.filter((c) => c.level === "error");
  const hasTaps = r.series.tapMaxA != null;
  const calcQuery = encodeInput(s);

  /* адрес страницы всегда описывает текущий расчёт; метки перехода и дилера сохраняем */
  useEffect(() => {
    if (embedded) return;
    const keep = new URLSearchParams(utm);
    if (dealer) keep.set("dealer", dealer);
    const merged = [calcQuery, keep.toString()].filter(Boolean).join("&");
    window.history.replaceState(null, "", merged ? `?${merged}` : window.location.pathname);
  }, [calcQuery, utm, dealer, embedded]);

  const leadCtx: LeadContext = {
    calcQuery,
    calcSummary: `${r.series.name} ${r.ratedA ?? "—"} А ${r.material} IP${r.ip} · трасса ${s.routeLenM} м · ${r.sections} секций`,
    dealer,
    source: embedded ? "widget" : "calc",
    utm,
  };

  const applyObject = (key: string) => {
    setObjectKey(key);
    setS((p) => ({ ...p, ...OBJECT_PRESET[key] }));
  };

  const volts = VOLTAGES[s.duty];

  return (
    <div className={embedded ? "px-3 py-4" : "mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-5"}>
      {/* прогресс */}
      <div className="relative mb-6 pt-4">
        <div className="absolute left-0 right-0 top-[30px] h-1.5 overflow-hidden rounded-full bg-line-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cur-d to-cur transition-[width] duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <div className="relative flex justify-between">
          {STEPS.map((n, i) => {
            const Ico = STEP_ICONS[i];
            const done = i < step;
            return (
              <button
                key={n}
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className="z-10 flex flex-1 flex-col items-center gap-2"
              >
                <span
                  className={`grid h-[26px] w-[26px] place-items-center rounded-lg border-2 transition-all duration-300 ${
                    done
                      ? "border-cur bg-cur text-white"
                      : i === step
                        ? "scale-110 border-cur bg-surface text-cur-d shadow-[0_0_0_5px_var(--color-cur-soft)]"
                        : "border-line-2 bg-surface text-mute"
                  }`}
                >
                  {done ? <IconCheck width={14} height={14} strokeWidth={2.4} /> : <Ico width={15} height={15} />}
                </span>
                <span className={`text-[10px] font-semibold sm:text-[11.5px] ${i <= step ? "text-ink" : "text-mute"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={embedded ? "" : "grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start"}>
        <div className="rounded-xl2 border border-line bg-surface p-4 sm:p-5">
          {step === 0 && (
            <>
              <h2 className="display text-[18px]">Что за объект</h2>
              <p className="mb-1 mt-1 text-[13px] text-mute">Подставим типовые значения — их можно поправить</p>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {OBJECTS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => applyObject(o.key)}
                    aria-pressed={objectKey === o.key}
                    className={`rounded-xl border-[1.5px] p-3 text-left transition-all duration-200 ${
                      objectKey === o.key
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface hover:-translate-y-px hover:border-cur"
                    }`}
                  >
                    <span className="block text-[13.5px] font-bold">{o.label}</span>
                    <span className={`mt-0.5 block text-[11px] leading-snug ${objectKey === o.key ? "text-[#8fb4c0]" : "text-mute"}`}>
                      {o.hint}
                    </span>
                  </button>
                ))}
              </div>

              <Row label="Задача трассы" hint={DUTIES.find((d) => d.key === s.duty)?.desc}>
                {DUTIES.map((d) => (
                  <Opt key={d.key} on={s.duty === d.key} onClick={() => set("duty", d.key)}>
                    {d.label}
                  </Opt>
                ))}
              </Row>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="display text-[18px]">Нагрузка</h2>
              <p className="mb-1 mt-1 text-[13px] text-mute">По мощности или сразу по току из расчёта проекта</p>

              <Row label="Исходные данные">
                <Opt on={s.mode === "power"} sub="кВт, cos φ" onClick={() => set("mode", "power")}>Мощность</Opt>
                <Opt on={s.mode === "current"} sub="из проекта" onClick={() => set("mode", "current")}>Ток</Opt>
              </Row>

              <div className="grid grid-cols-2 items-end gap-2 border-t border-line py-3.5 sm:grid-cols-3">
                {s.mode === "power" ? (
                  <>
                    <Num label="Мощность" unit="кВт" value={s.powerKW} onChange={(v) => set("powerKW", v)} step={10} />
                    <Num label="cos φ" unit="" value={s.cosPhi} onChange={(v) => set("cosPhi", v)} step={0.01} />
                    <Num label="Одновременность" unit="Kс" value={s.demand} onChange={(v) => set("demand", v)} step={0.05} />
                  </>
                ) : (
                  <Num label="Расчётный ток" unit="А" value={s.currentA} onChange={(v) => set("currentA", v)} step={50} hint="Kс уже учтён в расчётном токе" />
                )}
                <Num label="Длина трассы" unit="м" value={s.routeLenM} onChange={(v) => set("routeLenM", v)} step={10} />
              </div>

              <Row label="Напряжение">
                {volts.map((v) => (
                  <Opt key={v} on={s.voltageV === v} onClick={() => set("voltageV", v)}>
                    {s.duty === "mv" ? `${v / 1000} кВ` : `${v} В`}
                  </Opt>
                ))}
              </Row>

              {hasTaps && (
                <Row label="Отводы" hint="сколько точек отбора нужно на трассе">
                  {[0, 3, 6, 10].map((n) => (
                    <Opt
                      key={n}
                      on={s.taps.length === n}
                      onClick={() => set("taps", Array(n).fill(63))}
                      sub={n === 0 ? "без отводов" : "по 63 А"}
                    >
                      {n}
                    </Opt>
                  ))}
                </Row>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="display text-[18px]">Условия эксплуатации</h2>
              <p className="mb-1 mt-1 text-[13px] text-mute">От них зависят степень защиты и поправки к току</p>

              <Row label="Среда">
                {IP_ENV.map((e) => (
                  <Opt key={e.key} on={s.env === e.key} sub={`IP${e.ip}`} onClick={() => set("env", e.key)}>
                    {e.label}
                  </Opt>
                ))}
              </Row>

              <Row label="Материал шин">
                {(["any", "Al", "Cu"] as const).map((m) => (
                  <Opt key={m} on={s.material === m} onClick={() => set("material", m)}>
                    {m === "any" ? "Любой" : m}
                  </Opt>
                ))}
              </Row>

              <Row label="Способ прокладки" hint={`k_m = ${r.deratingParts.km.toFixed(2)}`}>
                {(Object.keys(MOUNT_LABEL) as (keyof typeof MOUNT_LABEL)[]).map((m) => (
                  <Opt key={m} on={s.mountWay === m} sub={`k_m ${MOUNT_FACTOR[m].toFixed(2)}`} onClick={() => set("mountWay", m)}>
                    {MOUNT_LABEL[m]}
                  </Opt>
                ))}
              </Row>

              <div className="grid grid-cols-2 items-end gap-2 border-t border-line py-3.5 sm:grid-cols-3">
                <Num label="Температура среды" unit="°C" value={s.ambientC} onChange={(v) => set("ambientC", v)} />
                <Num label="Трасс рядом" unit="шт" value={s.parallelRuns} onChange={(v) => set("parallelRuns", v)} min={1} />
                <Num label="Высота" unit="м" value={s.altitudeM} onChange={(v) => set("altitudeM", v)} step={100} />
              </div>

              <Row label="Огнестойкость">
                {([0, 60, 120] as const).map((f) => (
                  <Opt key={f} on={s.fireE === f} onClick={() => set("fireE", f)}>
                    {f === 0 ? "Не требуется" : `E${f}`}
                  </Opt>
                ))}
              </Row>
            </>
          )}

          {step === 3 && (
            <>
              <div className="busgrid relative overflow-hidden rounded-xl2 bg-ink p-5 text-white">
                <p className="eyebrow text-[#8fb4c0]">Предварительный подбор</p>
                <p className="display mt-2 text-[clamp(22px,4.6vw,32px)]">
                  {r.series.name}
                  {r.ratedA != null && <span className="text-cur"> · {fmt(r.ratedA)} А</span>}
                </p>
                <p className="mt-1 text-[12.5px] text-[#8fb4c0]">{r.series.title}</p>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/10 pt-4 text-[12.5px] sm:grid-cols-3">
                  {[
                    ["Расчётный ток", `${fmt(r.loadA)} А`],
                    [`С поправкой (k ${r.derating.toFixed(3)})`, `${fmt(r.requiredA)} А`],
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
              </div>

              {r.tapBoxes.length > 0 && (
                <div className="mt-4 rounded-xl2 border border-line bg-bg p-4">
                  <h3 className="eyebrow text-mute">Коробки отбора</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.tapBoxes.map((t, i) => (
                      <span key={i} className="rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[12px] font-bold">
                        {t.boxA != null ? `КОМ ${t.boxA} А` : "нет в ряду"}
                        {t.viaSection && <span className="ml-1 text-copper">секция</span>}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11.5px] text-mute">
                    Ряд КОМ: {TAP_BOXES.join(" · ")} А. В стандартное окно — до 250 А.
                  </p>
                </div>
              )}

              {/* трассировка — раздел 7.12 */}
              <details className="mt-4 rounded-xl2 border border-line bg-surface p-4">
                <summary className="cursor-pointer list-none">
                  <span className="eyebrow text-mute">Как посчитано</span>
                </summary>
                <ol className="mt-3">
                  {r.trace.map((t, i) => (
                    <li key={i} className="border-t border-line py-2.5 first:border-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[12.5px] font-semibold leading-snug">
                          <span className="mr-1.5 font-mono text-[11px] text-mute">{i + 1}</span>
                          {t.what}
                        </span>
                        <span className="flex-none font-mono text-[12.5px] font-bold text-cur-d">{t.result}</span>
                      </div>
                      {t.formula && <p className="mt-1 font-mono text-[11.5px] text-ink-2">{t.formula}</p>}
                      {t.substitution && <p className="mt-0.5 font-mono text-[11px] text-mute">= {t.substitution}</p>}
                      {t.norm && <p className="mt-1 text-[11px] leading-snug text-mute">{t.norm}</p>}
                    </li>
                  ))}
                </ol>
              </details>

              {/* чего в предварительном расчёте нет — и почему это точка конверсии */}
              <div className="mt-4 rounded-xl2 border border-copper/30 bg-copper/[0.06] p-4">
                <p className="text-[13px] font-bold text-copper">Чего в предварительном расчёте нет</p>
                <ul className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                  <li>Цены и веса трассы: прайс и массы позиций в публичном каталоге не опубликованы.</li>
                  <li>Полной спецификации: нужна геометрия трассы — изломы, тройники, точки питания.</li>
                  <li>Падения напряжения и стойкости к КЗ: нужны R, X, I_cw, I_pk по номиналу.</li>
                </ul>
                <p className="mt-2 text-[12px] text-mute">
                  Всё это считает инженер КЛМ по заявке. Диапазон цены здесь не показываем сознательно:
                  ориентировочная цифра без прайса — это выдумка, попавшая в переписку.
                </p>
              </div>

              {!embedded && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line-2 px-4 py-2.5 text-[13px] font-bold transition-colors hover:border-ink"
                  >
                    <IconLink width={15} height={15} />
                    Скопировать ссылку на расчёт
                  </button>
                  <Link href={`/podbor?${calcQuery}`} className="text-[13px] font-bold text-cur-d underline decoration-cur/40 underline-offset-4">
                    Открыть в полной панели →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* боковая панель: живой итог и проверки */}
        {!embedded && (
          <div className="lg:sticky lg:top-20">
            <div className="rounded-xl2 border border-line bg-surface p-4">
              <h3 className="eyebrow text-mute">Итог</h3>
              <p className="display mt-1.5 text-[20px]">
                {r.series.name}
                {r.ratedA != null && <span className="text-cur-d"> · {fmt(r.ratedA)} А</span>}
              </p>
              <p className="mt-1 text-[12px] text-mute">
                {fmt(r.loadA)} А расчётных · {r.material} · IP{r.ip}
              </p>

              {r.checks.length > 0 && (
                <ul className="mt-3 border-t border-line pt-2">
                  {r.checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 py-1.5">
                      <span
                        className={`mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full ${
                          c.level === "error" ? "bg-fault-soft text-fault" : c.level === "warn" ? "bg-cur-soft text-cur-d" : "bg-bg text-mute"
                        }`}
                      >
                        {c.level === "info" ? <IconCheck className="h-2.5 w-2.5" /> : <IconAlert className="h-2.5 w-2.5" />}
                      </span>
                      <span className="text-[11.5px] leading-snug">{c.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {r.checks.length === 0 && (
                <p className="mt-3 flex items-center gap-2 border-t border-line pt-2.5 text-[12px] font-semibold text-cur-d">
                  <IconCheck className="h-3.5 w-3.5" />
                  Ограничений не нашлось
                </p>
              )}
            </div>

            {step === 3 && (
              <div className="mt-4">
                <LeadForm ctx={leadCtx} />
              </div>
            )}

            <a
              href={src(r.series.source)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-cur-d hover:underline"
            >
              <IconTap className="h-3.5 w-3.5" />
              Страница серии на сайте КЛМ
            </a>
          </div>
        )}
      </div>

      {/* заявка в виджете идёт под результатом: боковой панели нет */}
      {embedded && step === 3 && (
        <div className="mt-4">
          <LeadForm ctx={leadCtx} />
        </div>
      )}

      {/* навигация */}
      <div className={embedded ? "mt-4 flex justify-between gap-2" : "mt-5 flex justify-between gap-2 lg:max-w-[calc(100%-360px)]"}>
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="rounded-full border-[1.5px] border-line-2 px-5 py-2.5 text-[13.5px] font-bold transition-colors hover:border-ink"
          >
            Назад
          </button>
        ) : (
          <span />
        )}
        {step < 3 && (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 2 && errors.length > 0}
            className="rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-bold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 2 && errors.length > 0 ? `Устраните ${errors.length}` : "Далее"}
          </button>
        )}
      </div>

      {embedded && (
        <p className="mt-4 border-t border-line pt-3 text-center text-[11px] text-mute">
          Расчёт{" "}
          <a href={src("/")} target="_blank" rel="noreferrer" className="font-semibold text-cur-d">
            КЛМ
          </a>{" "}
          · предварительный, не заменяет проект
        </p>
      )}
    </div>
  );
}
