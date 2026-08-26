import type { Metadata } from "next";
import { requireSession } from "@/lib/dal";
import { Card, Section } from "@/components/ui";
import SystemHealth from "@/components/SystemHealth";

export const metadata: Metadata = {
  title: "Конвертер спецификаций · КЛМ",
  robots: { index: false, follow: false },
};

export default async function ConverterPage() {
  await requireSession();

  return (
    <main>
      <Section>
        <div className="max-w-3xl">
          <p className="eyebrow text-cur-d">Рабочая область</p>
          <h1 className="display mt-3 text-[clamp(24px,4vw,38px)] leading-tight">
            KLM Specification Converter
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute">
            Платформа автоматической перебивки спецификаций шинопровода конкурентов на артикулы КЛМ.
          </p>
        </div>

        <Card className="mt-8 max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-mute">Состояние системы</p>
              <h2 className="display mt-2 text-[18px]">Готовность инфраструктуры</h2>
            </div>
            <span className="rounded-full bg-cur-soft px-3 py-1 text-[11px] font-bold text-cur-d">
              Этап 1
            </span>
          </div>
          <div className="mt-5">
            <SystemHealth />
          </div>
        </Card>

        <div className="mt-5 max-w-3xl rounded-xl2 border border-dashed border-line-2 bg-surface p-6 sm:p-8">
          <p className="text-[14px] font-bold">Конвертация будет доступна на следующем этапе</p>
          <p className="mt-2 text-[13px] leading-relaxed text-mute">
            На текущем этапе настроена рабочая область и реальная проверка подключения к базе данных.
            Загрузка файлов, распознавание и сопоставление позиций пока не выполняются.
          </p>
        </div>
      </Section>
    </main>
  );
}
