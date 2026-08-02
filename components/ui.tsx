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
