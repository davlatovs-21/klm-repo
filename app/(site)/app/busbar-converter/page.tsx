import type { Metadata } from "next";
import { Section } from "@/components/ui";
import TraySpecificationConverter from "@/components/TraySpecificationConverter";
import catalogSources from "@/data/busbar-catalogs/sources.json";

export const metadata: Metadata = {
  title: "Расчёт спецификации шинопровода · КЛМ",
  robots: { index: false, follow: false },
};

export default function BusbarConverterPage() {
  return (
    <main>
      <Section>
        <div className="max-w-4xl">
          <p className="eyebrow text-cur-d">Автоматический подбор аналогов</p>
          <h1 className="display mt-3 text-[clamp(24px,4vw,38px)] leading-tight">Расчёт спецификации шинопровода KLM</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute">
            Загрузите Excel, CSV или PDF-спецификацию конкурента. Система распознает производителя, серию, номинальный ток, материал шин, IP, число проводников и тип элемента, затем подготовит предварительный аналог KLM.
          </p>
        </div>
        <div className="mt-6 rounded-xl2 border border-line bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="display text-[17px]">База каталогов конкурентов</h2>
            <span className="text-[11px] text-mute">Проверено {catalogSources.checkedAt}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {catalogSources.sources.map((source) => (
              <span key={source.file} className="rounded-full bg-cur-soft px-3 py-1.5 text-[11px] font-bold text-cur-d">
                {source.manufacturer} · {source.series.join(", ")}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-mute">Официальные PDF сохранены локально. Инженерная эквивалентность подтверждается по техническим параметрам каталога.</p>
        </div>
        <TraySpecificationConverter mode="busbar" />
      </Section>
    </main>
  );
}
