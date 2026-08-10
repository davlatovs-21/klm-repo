import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { SNAPSHOT } from "@/lib/core/klm-catalog";

/** «5 августа 2026», без «г.» — в строке и так тесно */
const SNAPSHOT_RU = new Date(SNAPSHOT)
  .toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
  .replace(" г.", "");

/**
 * Шапка несёт только инструменты инженера. Материалы о самом проекте —
 * объём работ, запрос данных, демонстрация прототипа — адресованы другим людям
 * и живут в подвале. Раньше семь пунктов двух назначений стояли в один ряд
 * и налезали на логотип.
 */
const TOOLS = [
  { href: "/calc", label: "Расчёт" },
  { href: "/app/route", label: "Конструктор" },
  { href: "/podbor", label: "Шинопровод" },
  { href: "/sravnenie", label: "Против кабеля" },
];

const ABOUT = [
  { href: "/demo", label: "Демонстрация КОМ" },
  { href: "/scope", label: "Объём и сроки" },
  { href: "/data", label: "Что нужно от вас" },
  { href: "/policy", label: "Обработка данных" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="no-print bg-ink px-4 py-1.5 text-center text-[11px] leading-snug text-[#8fb4c0]">
        Данные каталога КЛМ, снимок {SNAPSHOT_RU}
        <span className="mx-1.5 text-[#3d5a66]">·</span>
        расчёт предварительный, не заменяет проект
      </p>

      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-5 sm:py-3">
          <Link href="/" className="group flex min-w-0 flex-none items-center gap-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-ink transition-transform duration-300 group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element -- статичный логотип 24px, оптимизация не нужна */}
              <img src="/klm/logo.png" alt="" width={24} height={24} className="h-6 w-6" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="display block truncate text-[15px] tracking-tight">КЛМ Трасса</span>
              <span className="hidden truncate text-[11px] text-mute sm:block">конфигуратор шинопровода</span>
            </span>
          </Link>

          {/* инструменты — от 1024 px; ниже всё уходит в шторку, ряд там не помещается */}
          <div className="ml-auto hidden items-center gap-1 lg:flex">
            {TOOLS.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold tracking-[-0.01em] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="ml-2 whitespace-nowrap rounded-full border-[1.5px] border-line-2 px-4 py-1.5 text-[13px] font-bold transition-colors hover:border-ink"
            >
              Кабинет
            </Link>
          </div>

          <div className="ml-auto lg:hidden">
            <MobileNav items={[...TOOLS, { href: "/login", label: "Кабинет" }, ...ABOUT]} />
          </div>
        </nav>

        {/* трасса под шапкой: единственное украшение, и оно про предмет */}
        <span className="anim-flow relative block h-[2px] bg-gradient-to-r from-cur-d/0 via-cur to-cur-d/0" />
      </header>

      {children}

      <footer className="no-print border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <p className="max-w-md text-[12.5px] leading-relaxed text-mute">
            Прототип по техническому заданию «Платформа КЛМ Трасса», редакция 3.0.
            Серии шинопроводов, ряды номиналов и коробки отбора взяты с сайта КЛМ
            (снимок {SNAPSHOT_RU}) и хранятся в проекте локально.
          </p>

          <nav aria-label="Инструменты">
            <h2 className="eyebrow text-mute">Инструменты</h2>
            <ul className="mt-3 grid gap-2">
              {TOOLS.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-[13px] font-semibold transition-colors hover:text-cur-d">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="О проекте">
            <h2 className="eyebrow text-mute">О проекте</h2>
            <ul className="mt-3 grid gap-2">
              {ABOUT.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-[13px] font-semibold transition-colors hover:text-cur-d">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
