"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SERIES, SERIES_KEYS, SERIES_HINT, BOX_IP, IP_TEXT, TAP_CURRENTS, TAP_WINDOW_MAX,
  HANDLE_THRESHOLD, CONNECTION, INSTALL_NOTE, boxFor, fitToSeries, type Material,
} from "@/lib/core/catalog";
import { SNAPSHOT } from "@/lib/core/klm-catalog";
import {
  runChecks, buildCode, codeString, encodeConfig, decodeConfig, DEFAULT_CONFIG, PRESETS, type Config,
} from "@/lib/core/engine";
import { Opt, Row } from "./ui";
import { BusbarScene, LoadGauge } from "./Illustrations";
import { IconCheck, IconAlert, IconCopy, IconLink, IconPrint, IconBus, IconTap, IconShield, IconGauge } from "./icons";

const STEPS = ["Шинопровод", "Отвод", "Проверка", "Результат"];
const STEP_ICONS = [IconBus, IconTap, IconShield, IconGauge];
const HISTORY_KEY = "klm-history";

/* ── основной компонент ─────────────────────────────────── */

/* инициализаторы состояния выполняются и при серверном пререндере — отсюда проверки на window */
const readHistory = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Configurator() {
  /* конфигурация восстанавливается из адреса страницы (пункт 5.7 ТЗ) */
  const params = useSearchParams();
  const fromUrl = useMemo(() => decodeConfig(params.toString()), [params]);

  const [s, setS] = useState<Config>(() => fromUrl ?? DEFAULT_CONFIG);
  const [step, setStep] = useState(() => (fromUrl ? 3 : 0));
  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState<"" | "code" | "link">("");
  const [dir, setDir] = useState(1);
  const [pulse, setPulse] = useState(false);
  const [history, setHistory] = useState<string[]>(readHistory);
  const [reveal, setReveal] = useState({ key: "", n: 0 });
  const reduceMotion = useState(prefersReducedMotion)[0];
  const prevCode = useRef("");

  const set = (patch: Partial<Config>) => setS((c) => ({ ...c, ...patch }));
  const cfg = SERIES[s.series];
  const compat = cfg.tapBoxCompatA;
  const box = boxFor(s.tapCurrent);
  const r = useMemo(() => runChecks(s), [s]);
  const segs = useMemo(() => buildCode(s), [s]);
  const code = codeString(s);
  const fails = r.checks.filter((c) => !c.ok);

  /* адрес страницы всегда описывает текущую конфигурацию */
  useEffect(() => {
    window.history.replaceState(null, "", `?${encodeConfig(s)}`);
  }, [s]);

  /* история последних десяти расчётов — пишется при выходе на результат */
  const remember = (cfg: Config) => {
    const res = runChecks(cfg);
    if (!res.ok || !res.box) return;
    const q = encodeConfig(cfg);
    const next = [q, ...readHistory().filter((x) => x !== q)].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setHistory(next);
  };

  useEffect(() => {
    if (prevCode.current && prevCode.current !== code) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 380);
      return () => clearTimeout(t);
    }
    prevCode.current = code;
  }, [code]);

  /* последовательный вывод проверок: счётчик привязан к шагу и конфигурации */
  const revealKey = `${step}|${code}`;
  const shown = reduceMotion ? 99 : reveal.key === revealKey ? reveal.n : 0;

  useEffect(() => {
    if (step !== 2 || reduceMotion) return;
    const id = setInterval(
      () => setReveal((p) => ({ key: revealKey, n: (p.key === revealKey ? p.n : 0) + 1 })),
      120,
    );
    return () => clearInterval(id);
  }, [step, revealKey, reduceMotion]);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    if (n === 3) remember(s);
  };

  const flash = useCallback((what: "code" | "link") => {
    setCopied(what);
    setTimeout(() => setCopied(""), 1600);
  }, []);

  const copy = (text: string, what: "code" | "link") =>
    navigator.clipboard?.writeText(text).then(() => flash(what)).catch(() => flash(what));

  return (
    <div className="pb-28">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6">
        {/* сценарии */}
        <div className="no-print mb-5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] tracking-wide text-mute">Сценарии:</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => { setS(p.state); setDir(1); setStep(2); setActive(null); }}
              className={`rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,60,80,0.08)] ${
                p.bad ? "hover:border-fault hover:text-fault" : "hover:border-cur hover:text-cur-d"
              }`}
            >
              {p.name}
            </button>
          ))}
          {history.length > 1 && (
            <button
              onClick={() => { const prev = decodeConfig(history[1]); if (prev) { setS(prev); setStep(3); } }}
              className="ml-auto rounded-full border border-dashed border-line-2 px-3 py-1.5 text-[12px] font-semibold text-mute transition-colors hover:border-cur hover:text-cur-d"
            >
              ← предыдущий расчёт
            </button>
          )}
        </div>

        {/* прогресс-«шинопровод» */}
        <div className="no-print relative mb-5 pt-5">
          <div className="absolute left-0 right-0 top-[33px] h-1.5 overflow-hidden rounded-full bg-line-2">
            <div
              className="anim-flow relative h-full rounded-full bg-gradient-to-r from-cur-d to-cur transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <div className="relative flex justify-between">
            {STEPS.map((n, i) => {
              const Ico = STEP_ICONS[i];
              const done = i < step, now = i === step;
              return (
                <button
                  key={n}
                  onClick={() => i <= step && go(i)}
                  disabled={i > step}
                  className="z-10 flex flex-1 flex-col items-center gap-2"
                >
                  <span
                    className={`grid h-[26px] w-[26px] place-items-center rounded-lg border-2 transition-all duration-300 ${
                      done
                        ? "border-cur bg-cur text-white"
                        : now
                          ? "scale-110 border-cur bg-surface text-cur-d shadow-[0_0_0_5px_var(--color-cur-soft)]"
                          : "border-line-2 bg-surface text-mute"
                    }`}
                  >
                    {done ? <IconCheck width={14} height={14} strokeWidth={2.4} /> : <Ico width={15} height={15} />}
                  </span>
                  <span className={`text-[10px] font-semibold leading-tight sm:text-[11.5px] ${done || now ? "text-ink" : "text-mute"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* живой артикул */}
        <div className="mb-4 rounded-xl2 border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(10,40,55,0.04),0_10px_28px_-14px_rgba(10,40,55,0.18)]">
          <div className="eyebrow mb-2.5 flex items-center justify-between text-mute">
            <span>Код заказа собирается по ходу</span>
            <span className="flex items-center gap-2 normal-case tracking-normal">
              <i
                className={`h-2 w-2 rounded-full ${
                  r.ok ? "bg-cur shadow-[0_0_0_4px_var(--color-cur-soft)]" : "bg-fault shadow-[0_0_0_4px_var(--color-fault-soft)]"
                }`}
              />
              {r.ok ? "допустимо" : `нарушений: ${fails.length}`}
            </span>
          </div>
          <div className={`flex flex-wrap gap-1.5 ${pulse ? "anim-pop" : ""}`}>
            {segs.map((sg, i) => (
              <button
                key={i}
                onClick={() => setActive((a) => (a === i ? null : i))}
                aria-pressed={active === i}
                className={`rounded-[11px] border px-2.5 pb-1.5 pt-2 text-left font-mono text-[clamp(14px,2.4vw,18px)] font-bold leading-tight transition-all duration-200 hover:-translate-y-0.5 hover:border-cur ${
                  active === i
                    ? "border-cur bg-cur text-white shadow-[0_8px_18px_-8px_rgba(0,140,160,0.6)]"
                    : "border-line bg-[#f4f8f9]"
                } ${sg.step > step && step < 2 ? "opacity-40" : ""}`}
              >
                <span className={`block font-sans text-[9px] font-bold tracking-[0.1em] ${active === i ? "text-white/80" : "text-mute"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {sg.v}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex min-h-[22px] flex-wrap items-baseline gap-2 border-t border-dashed border-line-2 pt-2.5 text-[13px] text-mute">
            {active === null ? (
              <span>Нажмите позицию кода — покажу, что она означает</span>
            ) : (
              <>
                <b className="text-ink">{segs[active].label}</b>
                <span>{segs[active].detail}</span>
              </>
            )}
          </div>
        </div>

        {/* карточка шага */}
        <div
          key={step}
          className={`rounded-xl2 border border-line bg-surface px-4 pb-5 pt-2 shadow-[0_1px_2px_rgba(10,40,55,0.04),0_18px_40px_-26px_rgba(10,40,55,0.3)] sm:px-5 ${
            dir > 0 ? "anim-r" : "anim-l"
          }`}
        >
          {step === 0 && (
            <>
              <h2 className="display mt-4 text-[18px]">Параметры шинопровода</h2>
              <p className="mb-3 mt-1 text-[13px] text-mute">Что уже проложено или заложено в проект</p>

              <Row label="Серия" hint={SERIES_HINT[s.series]}>
                {SERIES_KEYS.map((k) => (
                  <Opt
                    key={k}
                    on={s.series === k}
                    off={SERIES[k].tapBoxCompatA == null}
                    sub={SERIES[k].title.split(" · ")[0]}
                    onClick={() => set(fitToSeries(k, s))}
                  >
                    {SERIES[k].name}
                  </Opt>
                ))}
              </Row>

              <Row
                label="Ток магистрали"
                hint={
                  compat
                    ? `КОМ встают на ${cfg.name} ${compat[0]}–${compat[1]} А; отводы суммарно до ${s.busCurrent} А`
                    : `У ${cfg.name} окон отбора по длине нет`
                }
              >
                {cfg.currents.map((c) => (
                  <Opt
                    key={c}
                    on={s.busCurrent === c}
                    off={compat != null && (c < compat[0] || c > compat[1])}
                    onClick={() => set({ busCurrent: c })}
                  >
                    {c} А
                  </Opt>
                ))}
              </Row>

              <Row label="Материал шин" hint={s.material === "Cu" ? "выше проводимость, дороже" : "легче и дешевле"}>
                {(["Al", "Cu"] as Material[]).map((m) => (
                  <Opt key={m} on={s.material === m} off={!cfg.materials.includes(m)} sub={m === "Cu" ? "медь" : "алюминий"} onClick={() => set({ material: m })}>
                    {m}
                  </Opt>
                ))}
              </Row>

              <Row label="Число проводников">
                {[4, 5].map((p) => (
                  <Opt key={p} on={s.poles === p} off={!cfg.poles.includes(p)} sub={p === 4 ? "3L + PEN" : "3L + N + PE"} onClick={() => set({ poles: p })}>
                    {p}
                  </Opt>
                ))}
              </Row>

              <Row label="Степень защиты трассы" hint={`у ${cfg.name} — IP${cfg.ip.join(" / IP")}`}>
                {cfg.ip.map((ip) => (
                  <Opt key={ip} on={s.busIP === ip} sub={IP_TEXT[ip]} onClick={() => set({ busIP: ip })}>IP{ip}</Opt>
                ))}
              </Row>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="display mt-4 text-[18px]">Параметры отвода</h2>
              <p className="mb-3 mt-1 text-[13px] text-mute">Что нужно снять с магистрали и чем защитить</p>

              <Row label="Ток отвода" hint={`ряд КОМ 16–630 А; в окно отбора — до ${TAP_WINDOW_MAX} А`}>
                {TAP_CURRENTS.map((c) => (
                  <Opt key={c} on={s.tapCurrent === c} sub={c > TAP_WINDOW_MAX ? "секция" : undefined} onClick={() => set({ tapCurrent: c })}>
                    {c}
                  </Opt>
                ))}
              </Row>

              <Row label="Число отводов" hint={`суммарно ${s.tapCurrent * s.tapCount} А из ${s.busCurrent} А магистрали`}>
                {[1, 2, 3, 4].map((n) => (
                  <Opt key={n} on={s.tapCount === n} off={s.tapCurrent * n > s.busCurrent} onClick={() => set({ tapCount: n })}>
                    {n}
                  </Opt>
                ))}
              </Row>

              <div className="border-t border-line py-3">
                <p className="text-[13px] font-semibold">Аппарат защиты и подключение</p>
                <p className="mt-1 text-[12.5px] text-mute">
                  {box ? `${box.name} — ${box.device.toLowerCase()}. ` : ""}
                  {CONNECTION.toLowerCase()}. {INSTALL_NOTE}. Не выбирается: следует из номинала корпуса по каталогу КЛМ.
                </p>
              </div>

              <Row label="Рукоятка управления" hint={s.tapCurrent >= HANDLE_THRESHOLD ? `обязательна от ${HANDLE_THRESHOLD} А` : "по требованию заказчика"}>
                {[false, true].map((h) => (
                  <Opt key={String(h)} on={s.handle === h} onClick={() => set({ handle: h })}>{h ? "Есть" : "Нет"}</Opt>
                ))}
              </Row>

              <Row label="Степень защиты корпуса" hint={`ряд КОМ — IP${BOX_IP.join(" / IP")}, не ниже IP${s.busIP} трассы`}>
                {BOX_IP.map((ip) => (
                  <Opt key={ip} on={s.boxIP === ip} off={ip < s.busIP} sub={IP_TEXT[ip]} onClick={() => set({ boxIP: ip })}>IP{ip}</Opt>
                ))}
              </Row>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="display mt-4 text-[18px]">Проверка совместимости</h2>
              <p className="mb-3 mt-1 text-[13px] text-mute">{r.checks.length} правил из справочника KLM</p>

              {r.checks.map((c, i) =>
                i < shown ? (
                  <div key={c.name} className="anim-up flex items-start gap-3 border-t border-line py-2.5" style={{ animationDelay: `${i * 25}ms` }}>
                    <span
                      className={`mt-0.5 grid h-[22px] w-[22px] flex-none place-items-center rounded-lg ${
                        !c.ok ? "bg-fault-soft text-fault" : c.warn ? "bg-amber-100 text-amber-700" : "bg-cur-soft text-cur-d"
                      }`}
                    >
                      {c.ok && !c.warn ? <IconCheck width={13} height={13} strokeWidth={2.4} /> : <IconAlert width={13} height={13} strokeWidth={2.2} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold">{c.name}</span>
                      <span className={`mt-0.5 block text-[12.5px] ${!c.ok ? "text-fault" : c.warn ? "text-amber-700" : "text-mute"}`}>
                        {c.ok && !c.warn ? (c.info ?? "соответствует") : c.text}
                      </span>
                    </span>
                    {!c.ok && c.fix && (
                      <button
                        onClick={() => set(c.fix!)}
                        className="self-center whitespace-nowrap rounded-full bg-fault px-3 py-1.5 text-[12px] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_14px_-6px_rgba(226,74,94,0.8)]"
                      >
                        {c.fixLabel}
                      </button>
                    )}
                  </div>
                ) : null,
              )}

              {shown >= r.checks.length && (
                <div
                  className={`mt-4 flex items-center gap-2.5 rounded-[14px] px-4 py-3.5 text-[13.5px] font-semibold ${
                    r.ok ? "bg-cur-soft text-cur-d" : "bg-fault-soft text-fault"
                  }`}
                >
                  {r.ok ? <IconCheck /> : <IconAlert />}
                  {r.ok
                    ? "Все правила выполнены — конфигурация может уходить в заказ"
                    : `${fails.length} нарушени${fails.length === 1 ? "е" : "я"}: такой заказ на завод уйти не должен`}
                </div>
              )}
            </>
          )}

          {step === 3 && r.box && (
            <>
              <div className="print-plain busgrid relative mt-4 overflow-hidden rounded-xl2 bg-ink p-5 text-white sm:p-6">
                <div className="pointer-events-none absolute -right-16 -top-32 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(0,174,192,0.42),transparent_65%)]" />
                <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center sm:gap-6">
                  <div>
                    <p className="eyebrow text-[#8fb4c0]">Коробка отбора мощности</p>
                    <p className="display mt-2 text-[clamp(24px,5vw,36px)]">{r.box.name}</p>
                    <p className="mt-1 font-mono text-[13px] text-cur">{code}</p>
                    <p className="mt-3 text-[12.5px] text-[#8fb4c0]">
                      {r.box.sku} · {r.box.device} · до 690 В AC
                    </p>
                  </div>
                  <LoadGauge percent={Math.round((s.tapCurrent / r.box.ratedA) * 100)} />
                </div>
              </div>

              <div className="mt-5 rounded-xl2 border border-line bg-[#f9fbfc] p-4">
                <BusbarScene
                  taps={s.tapCount}
                  tapCurrent={s.tapCurrent}
                  busCurrent={s.busCurrent}
                  mount="bolt"
                  ok
                  className="w-full"
                />
              </div>

              <table className="mt-5 w-full border-collapse text-[13.5px]">
                <tbody>
                  {[
                    ["Шинопровод", `${cfg.name} · ${s.busCurrent} А · ${s.material}`],
                    ["Проводники, IP трассы", `${s.poles} · IP${s.busIP}`],
                    ["Подключение", r.box.viaSection ? "Секция отбора" : "Окно отбора, болтовое"],
                    ["Отводы", `${s.tapCount} × ${s.tapCurrent} А = ${r.total} А`],
                    ["Номинал магистрали", `${r.limit} А`],
                    ["Защита, рукоятка", `${r.box.device} · ${s.handle ? "Y1" : "Y0"}`],
                    ["Корпус", `${r.box.ratedA} А · IP${s.boxIP}`],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td className="border-t border-line py-2.5 text-mute">{k}</td>
                      <td className="border-t border-line py-2.5 pl-3 text-right font-mono text-[12.5px] font-bold sm:text-[13px]">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {r.notes.length > 0 && (
                <div className="mt-6">
                  <h3 className="eyebrow text-mute">Рекомендации по монтажу</h3>
                  <ul className="mt-2">
                    {r.notes.map((n) => (
                      <li key={n} className="relative border-t border-line py-2 pl-6 text-[13px] text-ink-2">
                        <span className="absolute left-1.5 top-[15px] h-1.5 w-1.5 rounded-full bg-cur opacity-60" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="no-print mt-6 grid gap-2 sm:flex sm:flex-wrap">
                <button
                  onClick={() => copy(code, "code")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-cur px-4 py-3 text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 sm:flex-none sm:py-2.5"
                >
                  <IconCopy width={16} height={16} />
                  {copied === "code" ? "Скопировано" : "Копировать код"}
                </button>
                <button
                  onClick={() => copy(window.location.href, "link")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-line-2 px-4 py-3 text-[13px] font-bold transition-colors hover:border-ink sm:flex-none sm:py-2.5"
                >
                  <IconLink width={16} height={16} />
                  {copied === "link" ? "Ссылка скопирована" : "Ссылка на конфигурацию"}
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-line-2 px-4 py-3 text-[13px] font-bold transition-colors hover:border-ink sm:flex-none sm:py-2.5"
                >
                  <IconPrint width={16} height={16} />
                  Печать / PDF
                </button>
              </div>
            </>
          )}

          {step === 3 && !r.box && (
            <div className="my-4 rounded-xl2 border border-fault/30 bg-fault-soft p-6">
              <p className="display text-[18px] text-fault">Стандартной позиции под эту комбинацию нет</p>
              <p className="mt-2 text-[13.5px] text-ink-2">
                {r.ok
                  ? "Комбинация допустима по правилам, но в справочнике отсутствует. Формирование кода заказа заблокировано — требуется запрос на завод."
                  : `Конфигурация нарушает ${fails.length} прав. Вернитесь к проверке и устраните нарушения.`}
              </p>
              <button onClick={() => go(2)} className="mt-4 rounded-full bg-fault px-4 py-2 text-[13px] font-bold text-white">
                К проверке
              </button>
            </div>
          )}
        </div>

        <p className="no-print mt-5 text-[12px] leading-relaxed text-mute">
          Ряд КОМ, аппараты защиты, IP и совместимость с ШРА взяты со страниц каталога КЛМ (снимок {SNAPSHOT}).
          Условными остаются два числа: порог обязательной рукоятки (125 А) и коэффициент одновременности отводов —
          в расчёте принят 1,0, то есть сумма отводов сравнивается с полным номиналом магистрали.
        </p>
      </div>

      {/* нижняя панель */}
      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
          <span className="hidden text-[12px] font-semibold text-mute sm:block">
            Шаг {step + 1} из 4 · {STEPS[step]}
          </span>
          <span className="text-[12px] font-semibold text-mute sm:hidden">{step + 1}/4</span>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => go(step - 1)} className="rounded-full border-[1.5px] border-line-2 px-4 py-2.5 text-[13px] font-bold transition-colors hover:border-ink sm:px-5 sm:text-[13.5px]">
                Назад
              </button>
            )}
            {step < 3 && (
              <button
                onClick={() => go(step + 1)}
                disabled={step === 2 && !r.ok}
                className="rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 sm:px-5 sm:text-[13.5px]"
              >
                {step === 2 ? (r.ok ? "К результату" : `Устраните ${fails.length}`) : "Далее"}
              </button>
            )}
            {step === 3 && (
              <button onClick={() => copy(code, "code")} className="rounded-full bg-cur px-4 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 sm:px-5 sm:text-[13.5px]">
                {copied === "code" ? "Скопировано" : "Скопировать код"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
