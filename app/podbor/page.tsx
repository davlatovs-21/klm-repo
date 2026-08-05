import type { Metadata } from "next";
import Link from "next/link";
import BusbarSelector from "@/components/BusbarSelector";
import { PageHero, Section, Head, Card } from "@/components/ui";
import { IMPORT_ANALOGS, SERIES, SNAPSHOT, src } from "@/lib/klm-catalog";

export const metadata: Metadata = {
  title: "Выбор шинопровода · KLM",
  description:
    "Помощник электронного каталога КЛМ: расчётный ток по мощности нагрузки, подбор серии и номинала шинопровода, коробки отбора мощности и проверка конфигурации.",
};

export default function PodborPage() {
  return (
    <main>
      <PageHero
        eyebrow="Помощник электронного каталога"
        title={
          <>
            Выбор <span className="text-cur">шинопровода</span> и коробок отбора мощности
          </>
        }
        lead="Введите мощность нагрузки и условия трассы — панель посчитает ток, подберёт серию и номинал из ряда КЛМ, назначит IP и материал шин, разложит отводы по коробкам отбора и покажет, что в конфигурации не сходится."
      />

      <BusbarSelector />

      <Section className="border-t border-line">
        <Head
          eyebrow="Справочник"
          title="Четыре серии закрывают весь диапазон"
          lead="Данные взяты со сайта КЛМ и хранятся в проекте локально — панель считает без обращения к внешним сервисам."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SERIES.map((s) => (
            <Card key={s.key}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="display text-[18px]">{s.name}</p>
                <a
                  href={src(s.source)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-none text-[11.5px] font-semibold text-cur-d hover:underline"
                >
                  каталог →
                </a>
              </div>
              <p className="mt-1 text-[13px] text-mute">{s.title}</p>
              <dl className="mt-3">
                {Object.entries(s.specs).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 border-t border-line py-2 text-[13px]">
                    <dt className="text-mute">{k}</dt>
                    <dd className="text-right font-mono text-[12.5px] font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      </Section>

      <Section dark>
        <Head
          eyebrow="Замена ушедших брендов"
          title="Габариты секций совпадают — замена 1:1"
          lead="Проект, выпущенный под импортный шинопровод, не нужно перепроектировать: посадочные размеры и шаг окон отбора совпадают."
          dark
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IMPORT_ANALOGS.map((a) => (
            <a
              key={a.brand}
              href={src(a.page)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl2 border border-white/10 p-4 transition-colors hover:border-cur"
            >
              <p className="text-[14px] font-bold">{a.brand}</p>
              <p className="mt-0.5 font-mono text-[12px] text-cur">{a.product}</p>
            </a>
          ))}
        </div>
      </Section>

      <Section className="border-t border-line">
        <Head
          eyebrow="Откуда данные"
          title="Локальная копия каталога заказчика"
          lead={
            <>
              Справочник серий, ряд номиналов и коробок отбора собраны с публичного сайта КЛМ (снимок {SNAPSHOT}) и лежат
              в репозитории: 537 страниц HTML, 221 товар с характеристиками, 10 категорий. Ссылки на страницы источника
              сохранены в каждой записи — если сайт станет недоступен, панель продолжит работать на локальных данных.
            </>
          }
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/data" className="text-[13px] font-semibold text-cur-d hover:underline">
            Что ещё нужно от заказчика →
          </Link>
          <Link href="/demo" className="text-[13px] font-semibold text-cur-d hover:underline">
            Конфигуратор КОМ и код заказа →
          </Link>
        </div>
      </Section>
    </main>
  );
}
