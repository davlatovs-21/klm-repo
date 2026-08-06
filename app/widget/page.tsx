import type { Metadata } from "next";
import CalcWizard from "@/components/CalcWizard";
import { readCalcParams, type RawParams } from "@/lib/calc-params";

/**
 * Встраиваемый виджет — требование M1.10 ТЗ. Без шапки и подвала: страница живёт
 * в чужом <iframe>, своя навигация ей только мешает.
 *
 * Встраивание:
 *   <iframe src="https://<домен>/widget?dealer=17" width="100%" height="900" style="border:0"></iframe>
 *
 * Заявки из виджета помечаются источником widget и идентификатором дилера,
 * чтобы падать на конкретного дилера, а не в общую воронку.
 */

export const metadata: Metadata = {
  title: "Расчёт шинопровода КЛМ",
  // виджет не должен попадать в поиск отдельной страницей
  robots: { index: false, follow: false },
};

export default async function WidgetPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const p = readCalcParams(await searchParams);

  return (
    <main className="min-h-screen bg-bg">
      <CalcWizard embedded initial={p.initial} initialStep={p.initialStep} utm={p.utm} dealer={p.dealer} />
    </main>
  );
}
