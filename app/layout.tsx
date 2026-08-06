import type { Metadata } from "next";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Корневая раскладка — только документ, шрифты и стили.
 * Шапка, подвал и баннер живут в app/(site)/layout.tsx, чтобы встраиваемый
 * виджет (/widget) отдавался без обвязки — требование M1.10 ТЗ.
 */

const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic"], weight: ["500", "600"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"] });
const mono = JetBrains_Mono({ variable: "--font-mono-code", subsets: ["latin", "cyrillic"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "KLM · Онлайн-панель подбора КОМ",
  description:
    "Подбор коробки отбора мощности к шинопроводу KLM: проверка совместимости по правилам справочника и код заказа за минуту вместо двадцати.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${unbounded.variable} ${manrope.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
