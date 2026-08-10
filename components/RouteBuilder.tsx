"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  analyzeRoute, DIRECTION_LABEL, FEED_LABEL, CROSSING_LABEL, DEFAULT_LAYOUT,
  type Route, type Segment, type Direction, type FeedPoint, type CrossingKind, type TapPoint, type Crossing,
} from "@/lib/core/route";
import { TAP_BOXES } from "@/lib/core/klm-catalog";
import { Opt, Row } from "./ui";
import { IconAlert, IconBus, IconCheck, IconTap, IconShield } from "./icons";

const DIRECTIONS = Object.keys(DIRECTION_LABEL) as Direction[];
const fmt = (n: number) => n.toLocaleString("ru-RU");
const DRAFT_KEY = "klm-route-draft";

/** Идентификаторы генерируются счётчиком, а не часами: расчёт должен быть воспроизводим */
let seq = 0;
const nextId = (prefix: string) => `${prefix}${++seq}`;

const EMPTY: Route = {
  segments: [
    { id: "s0", direction: "x+", lengthMm: 30_000, ratedA: 1600 },
    { id: "s1", direction: "y+", lengthMm: 12_000, ratedA: 1600 },
  ],
  taps: [{ id: "t0", positionM: 12, currentA: 63, purpose: "Щит освещения" }],
  crossings: [],
  feed: "start",
  material: "Al",
  branches: 0,
};

function Num({
  label, unit, value, onChange, step = 1, min = 0, wide,
}: {
  label?: string; unit?: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; wide?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${wide ? "flex-1" : ""}`}>
      {label && <span className="text-[11px] font-semibold leading-tight text-mute">{label}</span>}
      <span className="flex items-baseline gap-1 rounded-lg border-[1.5px] border-line bg-surface px-2.5 py-1.5 focus-within:border-cur">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent font-mono text-[13px] font-bold outline-none"
        />
        {unit && <span className="flex-none font-mono text-[10.5px] text-mute">{unit}</span>}
      </span>
    </label>
  );
}

const btn = "rounded-lg border border-line bg-surface px-2 py-1 text-[12px] font-bold transition-colors hover:border-cur disabled:opacity-30";

export default function RouteBuilder() {
  const [r, setR] = useState<Route>(EMPTY);
  const [restored, setRestored] = useState(false);

  /* черновик переживает закрытие вкладки — ТЗ M3.8. Серверное автосохранение
     появится вместе с привязкой конфигурации к проекту. */
  useEffect(() => {
    let draft: Route | null = null;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) draft = JSON.parse(saved) as Route;
    } catch {
      /* черновик битый — работаем с чистой трассой */
    }
    if (!draft) return;
    // восстановление не срочное: через startTransition, чтобы не вызывать каскад отрисовок
    startTransition(() => {
      setR(draft);
      setRestored(true);
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(r)), 400);
    return () => clearTimeout(id);
  }, [r]);

  const result = useMemo(() => analyzeRoute(r, DEFAULT_LAYOUT), [r]);
  const errors = result.checks.filter((c) => c.level === "error");

  const setSeg = (id: string, patch: Partial<Segment>) =>
    setR((p) => ({ ...p, segments: p.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const move = (i: number, delta: number) =>
    setR((p) => {
      const next = [...p.segments];
      const j = i + delta;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, segments: next };
    });

  const addSeg = () =>
    setR((p) => ({
      ...p,
      segments: [
        ...p.segments,
        { id: nextId("s"), direction: "x+", lengthMm: 6_000, ratedA: p.segments.at(-1)?.ratedA },
      ],
    }));

  const addTap = () =>
    setR((p) => ({ ...p, taps: [...p.taps, { id: nextId("t"), positionM: 0, currentA: 63 }] }));

  const setTap = (id: string, patch: Partial<TapPoint>) =>
    setR((p) => ({ ...p, taps: p.taps.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

  const addCrossing = (kind: CrossingKind) =>
    setR((p) => ({ ...p, crossings: [...p.crossings, { id: nextId("c"), positionM: 0, kind }] }));

  const setCrossing = (id: string, patch: Partial<Crossing>) =>
    setR((p) => ({ ...p, crossings: p.crossings.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-32 sm:px-5">
      {restored && (
        <p className="mb-4 rounded-xl border border-line bg-surface px-3 py-2 text-[12px] text-mute">
          Восстановлен черновик из этого браузера.{" "}
          <button
            onClick={() => { localStorage.removeItem(DRAFT_KEY); setR(EMPTY); setRestored(false); }}
            className="font-semibold text-cur-d underline decoration-cur/40 underline-offset-2"
          >
            Начать заново
          </button>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* ── ввод ─────────────────────────────────────────────── */}
        <div className="grid gap-4">
          {/* участки */}
          <div className="rounded-xl2 border border-line bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconBus className="h-4 w-4 text-cur-d" />
                <h2 className="display text-[17px]">Участки трассы</h2>
              </div>
              <button onClick={addSeg} className={btn}>+ участок</button>
            </div>
            <p className="mb-3 mt-1 text-[12.5px] text-mute">
              Углы подставляются сами на каждом изломе — по смене направления
            </p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-wide text-mute">
                    <th className="pb-1.5 font-semibold">№</th>
                    <th className="pb-1.5 font-semibold">Направление</th>
                    <th className="pb-1.5 font-semibold">Длина, мм</th>
                    <th className="pb-1.5 font-semibold">Номинал, А</th>
                    <th className="pb-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {r.segments.map((s, i) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="py-2 pr-2 font-mono text-[12px] text-mute">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <select
                          value={s.direction}
                          onChange={(e) => setSeg(s.id, { direction: e.target.value as Direction })}
                          className="rounded-lg border-[1.5px] border-line bg-surface px-2 py-1.5 text-[12.5px] font-semibold outline-none focus:border-cur"
                        >
                          {DIRECTIONS.map((d) => (
                            <option key={d} value={d}>{DIRECTION_LABEL[d]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <Num value={s.lengthMm} onChange={(v) => setSeg(s.id, { lengthMm: v })} step={500} />
                      </td>
                      <td className="py-2 pr-2">
                        <Num value={s.ratedA ?? 0} onChange={(v) => setSeg(s.id, { ratedA: v || undefined })} step={100} />
                      </td>
                      <td className="py-2">
                        <span className="flex gap-1">
                          <button onClick={() => move(i, -1)} disabled={i === 0} className={btn} aria-label="выше">↑</button>
                          <button onClick={() => move(i, 1)} disabled={i === r.segments.length - 1} className={btn} aria-label="ниже">↓</button>
                          <button
                            onClick={() => setR((p) => ({ ...p, segments: p.segments.filter((x) => x.id !== s.id) }))}
                            className={btn}
                            aria-label="удалить"
                          >
                            ×
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Row label="Точка питания" hint={FEED_LABEL[r.feed]}>
              {(Object.keys(FEED_LABEL) as FeedPoint[]).map((f) => (
                <Opt key={f} on={r.feed === f} onClick={() => setR((p) => ({ ...p, feed: f }))}>
                  {FEED_LABEL[f]}
                </Opt>
              ))}
            </Row>

            <Row label="Материал шин">
              {(["Al", "Cu"] as const).map((m) => (
                <Opt key={m} on={r.material === m} onClick={() => setR((p) => ({ ...p, material: m }))}>
                  {m === "Al" ? "Алюминий" : "Медь"}
                </Opt>
              ))}
            </Row>

            <Row label="Ответвлений от магистрали" hint="каждое даёт тройник и заглушку на конце">
              {[0, 1, 2, 3].map((b) => (
                <Opt key={b} on={r.branches === b} onClick={() => setR((p) => ({ ...p, branches: b }))}>
                  {b}
                </Opt>
              ))}
            </Row>
          </div>

          {/* отводы */}
          <div className="rounded-xl2 border border-line bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconTap className="h-4 w-4 text-cur-d" />
                <h2 className="display text-[17px]">Точки отбора</h2>
              </div>
              <button onClick={addTap} className={btn}>+ отвод</button>
            </div>
            <p className="mb-3 mt-1 text-[12.5px] text-mute">
              Ряд КОМ: {TAP_BOXES.join(" · ")} А. Выше 250 А — секция отбора вместо окна
            </p>

            {r.taps.length === 0 && <p className="py-2 text-[12.5px] text-mute">Отводов нет</p>}

            <div className="grid gap-2">
              {r.taps.map((t) => (
                <div key={t.id} className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
                  <Num label="Позиция" unit="м" value={t.positionM} onChange={(v) => setTap(t.id, { positionM: v })} />
                  <Num label="Ток" unit="А" value={t.currentA} onChange={(v) => setTap(t.id, { currentA: v })} step={10} />
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-[11px] font-semibold leading-tight text-mute">Назначение</span>
                    <input
                      value={t.purpose ?? ""}
                      onChange={(e) => setTap(t.id, { purpose: e.target.value })}
                      placeholder="станок 12"
                      className="rounded-lg border-[1.5px] border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-cur"
                    />
                  </label>
                  <button
                    onClick={() => setR((p) => ({ ...p, taps: p.taps.filter((x) => x.id !== t.id) }))}
                    className={`${btn} mb-1`}
                    aria-label="удалить отвод"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* пересечения */}
          <div className="rounded-xl2 border border-line bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <IconShield className="h-4 w-4 text-cur-d" />
              <h2 className="display text-[17px]">Пересечения границ</h2>
            </div>
            <p className="mb-3 mt-1 text-[12.5px] text-mute">
              Отметьте, где трасса пересекает огнестойкую границу, стену или деформационный шов
            </p>

            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CROSSING_LABEL) as CrossingKind[]).map((k) => (
                <button key={k} onClick={() => addCrossing(k)} className={btn}>
                  + {CROSSING_LABEL[k].toLowerCase()}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-2">
              {r.crossings.map((c) => (
                <div key={c.id} className="flex items-end gap-2 border-t border-line pt-2">
                  <Num label="Позиция" unit="м" value={c.positionM} onChange={(v) => setCrossing(c.id, { positionM: v })} />
                  <span className="mb-2 flex-1 text-[12.5px] text-ink-2">{CROSSING_LABEL[c.kind]}</span>
                  <button
                    onClick={() => setR((p) => ({ ...p, crossings: p.crossings.filter((x) => x.id !== c.id) }))}
                    className={`${btn} mb-1`}
                    aria-label="удалить пересечение"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── итог ─────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-20">
          <div className="busgrid overflow-hidden rounded-xl2 bg-ink p-5 text-white">
            <p className="eyebrow text-[#8fb4c0]">Трасса</p>
            <p className="display mt-2 text-[clamp(22px,4.6vw,30px)]">{fmt(result.totalLengthM)} м</p>
            <p className="mt-1 text-[12.5px] text-[#8fb4c0]">
              {fmt(result.horizontalLengthM)} м по горизонтали · {fmt(result.verticalLengthM)} м по вертикали
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/10 pt-4 text-[12.5px]">
              <div>
                <dt className="text-[#8fb4c0]">Позиций в спецификации</dt>
                <dd className="font-mono text-[13.5px] font-bold">{fmt(result.totalItems)}</dd>
              </div>
              <div>
                <dt className="text-[#8fb4c0]">Классов элементов</dt>
                <dd className="font-mono text-[13.5px] font-bold">{result.elements.length}</dd>
              </div>
            </dl>
          </div>

          {/* спецификация */}
          <div className="mt-4 rounded-xl2 border border-line bg-surface p-4">
            <h3 className="eyebrow text-mute">Спецификация из геометрии</h3>
            {result.elements.length === 0 ? (
              <p className="mt-2 text-[13px] text-mute">Добавьте участки — спецификация соберётся сама</p>
            ) : (
              <ul className="mt-2">
                {result.elements.map((e, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 first:border-0">
                    <span className="min-w-0 text-[12.5px] leading-snug">
                      {e.class}
                      {e.detail && <span className="text-mute"> · {e.detail}</span>}
                    </span>
                    <span className="flex-none font-mono text-[13px] font-bold text-cur-d">{e.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* проверки */}
          <div className="mt-4 rounded-xl2 border border-line bg-surface p-4">
            <h3 className="eyebrow text-mute">
              Проверки {errors.length > 0 && <span className="text-fault">· {errors.length} ошиб.</span>}
            </h3>
            {result.checks.length === 0 && (
              <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-cur-d">
                <IconCheck className="h-4 w-4" /> Замечаний нет
              </p>
            )}
            <ul>
              {result.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-2 border-t border-line py-2 first:border-0">
                  <span
                    className={`mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full ${
                      c.level === "error" ? "bg-fault-soft text-fault" : c.level === "warn" ? "bg-cur-soft text-cur-d" : "bg-bg text-mute"
                    }`}
                  >
                    {c.level === "info" ? <IconCheck className="h-2.5 w-2.5" /> : <IconAlert className="h-2.5 w-2.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] leading-snug">{c.text}</span>
                    {c.fix && <span className="mt-0.5 block text-[11px] leading-snug text-mute">{c.fix}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* трассировка */}
          <details className="mt-4 rounded-xl2 border border-line bg-surface p-4">
            <summary className="cursor-pointer list-none">
              <span className="eyebrow text-mute">Как посчитано</span>
            </summary>
            <ol className="mt-3">
              {result.trace.map((t, i) => (
                <li key={i} className="border-t border-line py-2 first:border-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] font-semibold leading-snug">{t.what}</span>
                    <span className="flex-none font-mono text-[12px] font-bold text-cur-d">{t.result}</span>
                  </div>
                  {t.formula && <p className="mt-0.5 font-mono text-[11px] text-ink-2">{t.formula}</p>}
                  {t.substitution && <p className="mt-0.5 font-mono text-[10.5px] text-mute">= {t.substitution}</p>}
                  {t.norm && <p className="mt-0.5 text-[10.5px] leading-snug text-mute">{t.norm}</p>}
                </li>
              ))}
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
