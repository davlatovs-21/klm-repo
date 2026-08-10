"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /* блокировка прокрутки под открытым меню */
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  /* Esc закрывает меню */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Открыть меню"
        aria-expanded={open}
        className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface lg:hidden"
      >
        <span className="flex w-5 flex-col gap-[5px]">
          <span className="h-[2px] w-full rounded-full bg-ink" />
          <span className="h-[2px] w-full rounded-full bg-ink" />
          <span className="h-[2px] w-3.5 rounded-full bg-ink" />
        </span>
      </button>

      {/* оверлей — порталом в body: backdrop-filter на шапке иначе становится
          containing block для position:fixed и меню обрезается по её высоте */}
      {open && createPortal(
        <div className="busgrid fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col overflow-y-auto overflow-x-hidden bg-ink text-white lg:hidden">
          {/* свечение в собственном клипающем слое: иначе растягивает область прокрутки оверлея */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-28 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(0,174,192,0.35),transparent_65%)]" />
          </div>

          <div className="relative flex items-center justify-between px-5 py-4">
            <span className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/10 text-[12px] font-bold text-cur">
                KL
              </span>
              <span className="leading-tight">
                <span className="display block text-[15px]">Подбор КОМ</span>
                <span className="block text-[11px] text-[#8fb4c0]">шинопровод KLM</span>
              </span>
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрыть меню"
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/15"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav className="relative flex flex-1 flex-col justify-center gap-1 px-5 pb-16">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={`display border-b border-white/10 py-5 text-[26px] transition-colors ${
                pathname === "/" ? "text-cur" : "hover:text-cur"
              }`}
            >
              Главная
            </Link>
            {items.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`display flex items-baseline gap-3 border-b border-white/10 py-5 text-[26px] transition-colors ${
                  pathname === n.href ? "text-cur" : "hover:text-cur"
                }`}
              >
                {n.label}
              </Link>
            ))}

            <Link
              href="/calc"
              onClick={() => setOpen(false)}
              className="mt-8 rounded-full bg-cur px-6 py-4 text-center text-[15px] font-bold text-white"
            >
              Рассчитать трассу →
            </Link>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
