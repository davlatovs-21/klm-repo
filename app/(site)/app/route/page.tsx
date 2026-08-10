import type { Metadata } from "next";
import Link from "next/link";
import RouteBuilder from "@/components/RouteBuilder";
import { requireSession } from "@/lib/dal";

export const metadata: Metadata = { title: "Конструктор трассы · КЛМ", robots: { index: false, follow: false } };

export default async function RoutePage() {
  await requireSession();

  return (
    <main>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5">
          <p className="eyebrow text-cur-d">Конструктор трассы</p>
          <h1 className="display mt-2 text-[clamp(22px,4vw,30px)]">Геометрия → спецификация</h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-mute">
            Опишите трассу участками: направление, длина, номинал. Углы, тройники, заглушки,
            вводные секции, компенсаторы и подвесы подставятся сами. Схема на канве появится
            вторым шагом — список работает на любом экране и не блокирует выпуск.
          </p>
          <Link href="/app" className="mt-3 inline-flex text-[13px] font-bold text-cur-d underline decoration-cur/40 underline-offset-4">
            ← В кабинет
          </Link>
        </div>
      </div>
      <RouteBuilder />
    </main>
  );
}
