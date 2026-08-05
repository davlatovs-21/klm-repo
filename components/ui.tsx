import Link from "next/link";
import type { ReactNode } from "react";

export function Section({
  children,
  dark,
  id,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`${dark ? "busgrid bg-ink text-white" : ""} ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-20">{children}</div>
    </section>
  );
}

export function Head({
  eyebrow,
  title,
  lead,
  dark,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p className={`eyebrow ${dark ? "text-cur" : "text-cur-d"}`}>{eyebrow}</p>
      <h2 className="display mt-3 text-[clamp(23px,4.4vw,38px)] leading-[1.14]">{title}</h2>
      {lead && <p className={`mt-4 text-[15px] sm:text-[16px] ${dark ? "text-[#8fb4c0]" : "text-mute"}`}>{lead}</p>}
    </div>
  );
}

/** Кнопка-вариант в строке параметров. off — вариант недопустим для текущей конфигурации */
export function Opt({
  on, off, onClick, children, sub,
}: {
  on?: boolean; off?: boolean; onClick: () => void; children: ReactNode; sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`min-w-[54px] rounded-xl border-[1.5px] px-3.5 py-2 text-left transition-all duration-200 ${
        off && on
          ? "border-fault bg-fault text-white"
          : on
            ? "border-ink bg-ink text-white shadow-[0_8px_18px_-10px_rgba(11,26,33,0.7)]"
            : off
              ? "border-line bg-surface opacity-35"
              : "border-line bg-surface hover:-translate-y-px hover:border-cur"
      }`}
    >
      <span className="block font-mono text-[13.5px] font-bold">{children}</span>
      {sub && <span className={`block text-[10.5px] font-medium ${on ? "text-[#8fb4c0]" : "text-mute"}`}>{sub}</span>}
    </button>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-line py-3.5 sm:grid-cols-[200px_1fr] sm:gap-4">
      <div>
        <span className="block text-[13.5px] font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-mute">{hint}</span>}
      </div>
      <div className="flex flex-wrap content-start gap-1.5">{children}</div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl2 border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(10,40,55,0.04),0_18px_40px_-30px_rgba(10,40,55,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Btn({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "cur";
}) {
  const base =
    "inline-flex flex-1 items-center justify-center rounded-full px-6 py-3.5 text-center text-[14px] font-bold transition-all duration-300 hover:-translate-y-0.5 sm:flex-none sm:py-3";
  const styles = {
    primary: "bg-ink text-white hover:shadow-[0_12px_26px_-12px_rgba(11,26,33,0.8)]",
    cur: "bg-cur text-white hover:shadow-[0_12px_26px_-12px_rgba(0,174,192,0.9)]",
    ghost: "border-[1.5px] border-line-2 text-current hover:border-current",
  }[variant];
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="busgrid relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute -right-24 -top-40 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,174,192,0.35),transparent_65%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-20">
        <Head eyebrow={eyebrow} title={title} lead={lead} dark />
        {children}
      </div>
    </section>
  );
}
