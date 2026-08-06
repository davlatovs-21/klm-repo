import type { Metadata } from "next";
import { Suspense } from "react";
import Configurator from "@/components/Configurator";

export const metadata: Metadata = {
  title: "Демо · Подбор КОМ KLM",
  description: "Рабочий прототип подбора: четыре шага, девять правил проверки, код заказа из девяти позиций.",
};

export default function DemoPage() {
  return (
    <main>
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl px-5 py-20 text-[13px] text-mute">Загрузка панели подбора…</div>
        }
      >
        <Configurator />
      </Suspense>
    </main>
  );
}
