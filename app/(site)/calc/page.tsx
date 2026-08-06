import type { Metadata } from "next";
import CalcWizard from "@/components/CalcWizard";
import { PageHero } from "@/components/ui";
import { readCalcParams, type RawParams } from "@/lib/calc-params";

export const metadata: Metadata = {
  title: "Калькулятор шинопровода · КЛМ",
  description:
    "Предварительный расчёт шинопровода за две минуты: тип объекта, мощность нагрузки, условия трассы — серия, номинал, материал шин, степень защиты и число секций из каталога КЛМ.",
};

export default async function CalcPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  // разбор на сервере: ссылка, присланная коллеге, отрисуется вместе с результатом
  const p = readCalcParams(await searchParams);

  return (
    <main>
      <PageHero
        eyebrow="Публичный расчёт · без регистрации"
        title={
          <>
            Расчёт шинопровода за <span className="text-cur">две минуты</span>
          </>
        }
        lead="Четыре шага: объект, нагрузка, условия, результат. Панель посчитает ток, подберёт серию и номинал из ряда КЛМ, назначит материал шин и степень защиты и покажет, как получено каждое число. Ссылку на расчёт можно переслать коллеге."
      />
      <CalcWizard initial={p.initial} initialStep={p.initialStep} utm={p.utm} dealer={p.dealer} />
    </main>
  );
}
