import type { Metadata } from "next";
import { Section, Head, Card, Btn, PageHero } from "@/components/ui";
import { IconTable, IconCode, IconLayers, IconGauge, IconBolt, IconShield, IconTap, IconPalette, IconClock, IconArrow } from "@/components/icons";

export const metadata: Metadata = {
  title: "Исходные данные · Подбор КОМ KLM",
  description: "Этап 0: какие справочные данные нужны от Заказчика, в каком виде и на что влияет каждый пункт.",
};

const DATA = [
  { Ico: IconTable, t: "Перечень моделей КОМ", f: "Excel или любая машиночитаемая таблица", need: "Подбор модели", d: "Серия шинопровода, тип установки, номинальный ток, поддерживаемые аппараты защиты, степень защиты, число полюсов." },
  { Ico: IconCode, t: "Расшифровка кода заказа", f: "Таблица или выдержка из каталога", need: "Формирование артикула", d: "Назначение каждой из девяти позиций и перечень допустимых значений." },
  { Ico: IconLayers, t: "Правила совместимости серий", f: "Таблица или текстовое описание", need: "Проверка совместимости", d: "Какие типы КОМ ставятся на какие серии шинопровода." },
  { Ico: IconGauge, t: "Предельные токи отвода", f: "Таблица", need: "Проверка по току", d: "По каждой серии и типоразмеру." },
  { Ico: IconBolt, t: "Соотношение токов", f: "Формула или коэффициент", need: "Проверка нагрузки", d: "Правило связи суммарного тока отводов и тока магистрали." },
  { Ico: IconShield, t: "Условия рукоятки и защиты", f: "Текстовое описание", need: "Проверка комплектации", d: "Когда рукоятка обязательна и в каких пределах применяются аппараты защиты." },
  { Ico: IconTap, t: "Указания по монтажу", f: "Текст", need: "Раздел рекомендаций", d: "Типовые указания, привязанные к типу установки и материалу шин." },
  { Ico: IconPalette, t: "Логотип и фирменные цвета", f: "SVG, PNG или руководство по стилю", need: "Оформление интерфейса", d: "При наличии требований к оформлению." },
];

const QUESTIONS: [string, string][] = [
  ["Подтверждается ли структура кода заказа из раздела 7? Какие позиции описаны неверно?", "Раздел 7, весь подбор"],
  ["Каково полное число моделей КОМ в номенклатуре?", "Объём справочника"],
  ["Каково фактическое правило соотношения суммарного тока отводов и тока магистрали?", "Правило 5"],
  ["Каков пороговый ток обязательного применения рукоятки управления?", "Правило 7"],
  ["Допускается ли степень защиты корпуса КОМ ниже степени защиты трассы?", "Правило 8"],
  ["Что предлагать пользователю при отсутствии подходящей модели: контакт менеджера, форму запроса, телефон?", "Пункт 6.3"],
  ["С какой периодичностью обновляется номенклатура?", "Нужна ли админка"],
  ["Требуется ли интерфейс на других языках помимо русского?", "Объём работ"],
  ["Размещение на домене Заказчика или на отдельном адресе? Кто даёт хостинг и сертификат?", "Этап 5"],
  ["Существуют ли требования к оформлению: логотип, цвета, шрифты?", "Этап 1"],
  ["Требуется ли вывод цены или срока поставки в результате подбора?", "Состав результата"],
];

export default function DataPage() {
  return (
    <main>
      <PageHero
        eyebrow="Этап 0"
        title="Что нужно от вас, чтобы начать"
        lead="Функция подбора полностью определяется содержанием справочника. До получения этих данных разработку подбора начать нельзя — поэтому передача данных выделена в отдельный этап."
      >
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            ["Один комплект", "данные передаются в электронном виде одним пакетом"],
            ["3 рабочих дня", "проверка комплекта на полноту и непротиворечивость"],
            ["Затем 17 дней", "отсчёт сроков начинается с приёмки комплекта"],
          ].map(([t, d]) => (
            <div key={t} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
              <p className="display text-[17px] text-cur">{t}</p>
              <p className="mt-1 text-[12.5px] text-[#8fb4c0]">{d}</p>
            </div>
          ))}
        </div>
      </PageHero>

      <Section>
        <Head
          eyebrow="Перечень"
          title="Восемь позиций справочных данных"
          lead="Рядом с каждой — в каком виде удобно передать и что без неё не работает."
        />
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {DATA.map(({ Ico, t, f, need, d }, i) => (
            <Card key={t}>
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-cur-soft text-cur-d">
                  <Ico />
                </span>
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-mute">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="display text-[16px]">{t}</h3>
                  <p className="mt-1.5 text-[13px] text-mute">{d}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11.5px]">
                    <span className="rounded-full bg-bg px-2.5 py-1 font-semibold text-ink-2">{f}</span>
                    <span className="rounded-full bg-cur-soft px-2.5 py-1 font-bold text-cur-d">{need}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section dark>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <Head dark eyebrow="Порядок" title="Как принимается комплект" />
            <ol className="mt-6 grid gap-3">
              {[
                "Данные передаются одним комплектом в электронном виде.",
                "Разработчик за три рабочих дня проверяет комплект на полноту и непротиворечивость.",
                "В ответ приходит либо подтверждение приёмки, либо перечень уточняющих вопросов.",
                "Этап 0 завершён с даты письменного подтверждения приёмки комплекта.",
              ].map((t, i) => (
                <li key={t} className="flex items-start gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-lg bg-cur font-mono text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-[13.5px] text-[#8fb4c0]">{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl2 border border-copper/40 bg-copper/10 p-6">
            <IconClock className="text-copper" />
            <p className="display mt-3 text-[18px]">Влияние на сроки</p>
            <p className="mt-2 text-[13.5px] text-[#c9d6dd]">
              Сроки этапов 1–5 отсчитываются от даты завершения Этапа 0. Задержка передачи данных сдвигает срок
              сдачи на соответствующее число рабочих дней и не является нарушением обязательств Разработчика.
            </p>
            <p className="mt-4 text-[13.5px] text-[#c9d6dd]">
              Если в ходе работ передаются данные, противоречащие ранее переданным, изменения оформляются
              письменно с оценкой влияния на срок и стоимость.
            </p>
          </div>
        </div>
      </Section>

      <Section className="border-t border-line bg-surface">
        <Head
          eyebrow="Открытые вопросы"
          title="Одиннадцать вопросов, которые закрываются на Этапах 0 и 1"
          lead="До получения ответов соответствующие требования считаются несогласованными."
        />
        <div className="mt-8 grid gap-2">
          {QUESTIONS.map(([q, a], i) => (
            <details key={q} className="group rounded-[14px] border border-line bg-bg px-4 py-3 transition-colors open:border-cur/40">
              <summary className="flex cursor-pointer list-none items-center gap-3 text-[13.5px] font-semibold marker:hidden">
                <span className="font-mono text-[11px] text-mute">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">{q}</span>
                <IconArrow className="flex-none rotate-90 text-mute transition-transform duration-300 group-open:-rotate-90" width={16} height={16} />
              </summary>
              <p className="mt-2 pl-8 text-[12.5px] text-mute">
                Влияет на: <b className="text-cur-d">{a}</b>
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Btn href="/demo" variant="primary">Посмотреть демо</Btn>
          <Btn href="/scope" variant="ghost">Объём и сроки</Btn>
        </div>
      </Section>
    </main>
  );
}
