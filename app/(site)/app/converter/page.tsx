import type { Metadata } from "next";
import { Section } from "@/components/ui";
import TraySpecificationConverter from "@/components/TraySpecificationConverter";

export const metadata: Metadata = {
  title: "Расчёт кабельных лотков · КЛМ",
  robots: { index: false, follow: false },
};

export default function ConverterPage() {
  return (
    <main>
      <Section>
        <div className="max-w-4xl">
          <p className="eyebrow text-cur-d">Автоматический подбор аналогов</p>
          <h1 className="display mt-3 text-[clamp(24px,4vw,38px)] leading-tight">
            Расчёт кабельных лотков KLM
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute">
            Загрузите Excel, CSV или PDF-спецификацию конкурента. Система распознает кабельные лотки и аксессуары, подберёт аналоги KLM и подготовит таблицу для дальнейшей работы.
          </p>
        </div>
        <TraySpecificationConverter />
      </Section>
    </main>
  );
}
