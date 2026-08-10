import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { SNAPSHOT } from "@/lib/core/klm-catalog";

const SNAPSHOT_RU = new Date(SNAPSHOT).toLocaleDateString("ru-RU");

const NAV = [
  { href: "/calc", label: "Калькулятор" },
  { href: "/app/route", label: "Конструктор трассы" },
  { href: "/podbor", label: "Выбор шинопровода" },
  { href: "/sravnenie", label: "Против кабеля" },
  { href: "/demo", label: "Демо" },
  { href: "/scope", label: "Объём и сроки" },
  { href: "/data", label: "Что нужно от вас" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="no-print bg-ink px-4 py-2 text-center text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-[#8fb4c0] sm:text-[11px] sm:tracking-[0.1em]">
        Справочник шинопроводов — <b className="text-cur">с сайта КЛМ, снимок {SNAPSHOT_RU}</b>
        <span className="hidden sm:inline"> · справочник КОМ условный · проверяйте подбор у инженера</span>
      </div>

      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-ink transition-transform duration-300 group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element -- статичный логотип 28px, оптимизация не нужна */}
              <img src="/klm/logo.png" alt="КЛМ" width={24} height={24} className="h-6 w-6" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="display block whitespace-nowrap text-[14px] sm:text-[15px]">Подбор КОМ</span>
              <span className="block whitespace-nowrap text-[11px] text-mute">шинопровод KLM</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex lg:gap-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold text-mute transition-colors hover:bg-surface hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/calc"
              className="ml-1 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-10px_rgba(11,26,33,0.75)]"
            >
              Рассчитать
            </Link>
          </div>

          <MobileNav items={NAV} />
        </nav>
      </header>

      {children}

      <footer className="no-print border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[12.5px] text-mute sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl">
            Прототип по техническому заданию «Платформа КЛМ Трасса», редакция 3.0. Серии шинопроводов,
            ряды номиналов и коробки отбора взяты с сайта КЛМ (снимок {SNAPSHOT_RU}) и хранятся в проекте
            локально. Расчёт носит предварительный характер и не заменяет проект.
          </p>
          <div className="flex flex-wrap gap-4">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="font-semibold transition-colors hover:text-ink">
                {n.label}
              </Link>
            ))}
            <Link href="/policy" className="font-semibold transition-colors hover:text-ink">
              Обработка данных
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
