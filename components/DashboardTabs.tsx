"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "Проекты", exact: true },
  { href: "/app/route", label: "Расчёт кабеленесущих систем", exact: false },
  { href: "/app/busbar-converter", label: "Спецификация шинопровода", exact: false },
  { href: "/app/converter", label: "Расчёт лотка", exact: false },
];

export default function DashboardTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Разделы кабинета" className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-5">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative whitespace-nowrap px-4 py-3 text-[13px] font-bold transition-colors ${
                active ? "text-cur-d" : "text-mute hover:text-ink"
              }`}
            >
              {item.label}
              {active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-cur" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
