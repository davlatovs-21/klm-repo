"use client";

import { useState } from "react";
import { buildCode, DEFAULT_CONFIG } from "@/lib/engine";

const SEGMENTS = buildCode(DEFAULT_CONFIG);

export default function CodeAnatomy({ dark = false }: { dark?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const cur = active === null ? null : SEGMENTS[active];

  return (
    <div
      className={`rounded-xl2 border p-5 ${
        dark ? "border-white/12 bg-white/[0.04]" : "border-line bg-surface shadow-[0_18px_40px_-30px_rgba(10,40,55,0.4)]"
      }`}
    >
      <div className={`eyebrow mb-3 flex items-center justify-between ${dark ? "text-[#8fb4c0]" : "text-mute"}`}>
        <span>Код заказа · 9 позиций</span>
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <i className="h-2 w-2 rounded-full bg-cur shadow-[0_0_0_4px_rgba(0,174,192,0.18)]" />
          допустимо
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SEGMENTS.map((s, i) => (
          <button
            key={i}
            onClick={() => setActive((a) => (a === i ? null : i))}
            aria-pressed={active === i}
            className={`rounded-[11px] border px-3 pb-1.5 pt-2 text-left font-mono text-[clamp(14px,2.2vw,18px)] font-bold leading-tight transition-all duration-300 hover:-translate-y-0.5 ${
              active === i
                ? "border-cur bg-cur text-white shadow-[0_10px_20px_-8px_rgba(0,174,192,0.7)]"
                : dark
                  ? "border-white/12 bg-white/[0.05] text-white hover:border-cur"
                  : "border-line bg-[#f4f8f9] hover:border-cur"
            }`}
          >
            <span
              className={`block font-sans text-[9px] font-bold tracking-[0.1em] ${
                active === i ? "text-white/75" : dark ? "text-[#8fb4c0]" : "text-mute"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {s.v}
          </button>
        ))}
      </div>

      <div
        className={`mt-3 flex min-h-[44px] flex-wrap items-baseline gap-2 border-t border-dashed pt-3 text-[13px] ${
          dark ? "border-white/12 text-[#8fb4c0]" : "border-line-2 text-mute"
        }`}
      >
        {cur ? (
          <>
            <b className={dark ? "text-white" : "text-ink"}>{cur.label}</b>
            <span>{cur.detail}</span>
          </>
        ) : (
          <span>Нажмите позицию — панель расшифрует её значение. То же поведение на всех шагах подбора.</span>
        )}
      </div>
    </div>
  );
}
