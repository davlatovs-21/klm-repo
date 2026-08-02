import type { Metadata } from "next";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import "./globals.css";

const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic"], weight: ["500", "600"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"] });
const mono = JetBrains_Mono({ variable: "--font-mono-code", subsets: ["latin", "cyrillic"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "KLM · Онлайн-панель подбора КОМ",
  description:
    "Подбор коробки отбора мощности к шинопроводу KLM: проверка совместимости по правилам справочника и код заказа за минуту вместо двадцати.",
};

const NAV = [
  { href: "/demo", label: "Демо" },
  { href: "/scope", label: "Объём и сроки" },
  { href: "/data", label: "Что нужно от вас" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${unbounded.variable} ${manrope.variable} ${mono.variable} antialiased`}>
        <div className="no-print bg-ink px-4 py-2 text-center text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-[#8fb4c0] sm:text-[11px] sm:tracking-[0.1em]">
          Демонстрационный прототип · <b className="text-cur">данные условные</b>
          <span className="hidden sm:inline"> · не для проектирования</span>
        </div>

        <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
            <Link href="/" className="group flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-ink text-[12px] font-bold text-cur transition-transform duration-300 group-hover:scale-105">
                KL
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
                href="/demo"
                className="ml-1 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-10px_rgba(11,26,33,0.75)]"
              >
                Попробовать
              </Link>
            </div>

            <MobileNav items={NAV} />
          </nav>
        </header>

        {children}

        <footer className="no-print border-t border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[12.5px] text-mute sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl">
              Прототип интерфейса по техническому заданию «Онлайн-панель подбора КОМ KLM», редакция 2.0.
              Справочник моделей, правила и структура кода заказа условные.
            </p>
            <div className="flex gap-4">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="font-semibold transition-colors hover:text-ink">
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
