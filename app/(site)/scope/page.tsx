import type { Metadata } from "next";
import { Section, Head, Card, Btn, PageHero } from "@/components/ui";
import { PipelineScene } from "@/components/Illustrations";
import { IconCheck, IconAlert, IconArrow, IconServer, IconLayers } from "@/components/icons";

export const metadata: Metadata = {
  title: "Объём и сроки · Подбор КОМ KLM",
  description: "Что входит в первый этап, что вынесено во второй и почему, сроки работ и порядок приёмки.",
};

const IN = [
  ["Ввод параметров шинопровода", "Серия, ток магистрали, материал шин, число проводников, IP трассы"],
  ["Ввод параметров отвода", "Ток отвода из ряда КОМ, число отводов, рукоятка, IP корпуса; аппарат защиты — по номиналу корпуса"],
  ["Проверка совместимости", "Список выполненных и нарушенных правил с пояснением каждого нарушения"],
  ["Автоматическое исправление", "Кнопка, приводящая параметр к допустимому значению"],
  ["Подбор модели КОМ", "Артикул каталога, номинал, встроенный аппарат защиты, загрузка по току"],
  ["Формирование кода заказа", "Готовая строка заказа с расшифровкой каждой позиции"],
  ["Рекомендации по монтажу", "Текстовые указания, привязанные к выбранной конфигурации"],
  ["Копирование кода заказа", "Код в буфере обмена одним нажатием"],
  ["Выгрузка результата", "Печатная форма и PDF со всеми параметрами и кодом"],
  ["Передача конфигурации", "Ссылка, полностью восстанавливающая введённые параметры"],
  ["Работа на телефоне и ПК", "Единый интерфейс от 360 пикселей ширины"],
];

const OUT = [
  ["Регистрация и вход", "Инструмент не хранит персональных или коммерческих данных. Учётная запись не требуется для расчёта."],
  ["Разделение ролей", "На первом этапе категория пользователей одна. Права имеют смысл только при сохраняемых данных."],
  ["Личный кабинет и хранение проектов", "Заменяется ссылкой на конфигурацию и локальной историей последних расчётов."],
  ["Админка справочников", "При обновлении каталога реже раза в месяц выгоднее передать файл и пересобрать. Экономия — около трети трудозатрат этапа."],
  ["Журнал действий", "Без учётных записей журнал не привязывается к субъекту."],
  ["Выгрузка в Excel и CSV", "Печать и PDF покрывают передачу результата. Добавляется на втором этапе при подтверждённой потребности."],
  ["Интеграция с 1С, CRM, заказами", "Требует отдельного обследования и согласования форматов обмена."],
  ["Многоязычный интерфейс", "Первый этап — русский язык. Другие языки по отдельному согласованию."],
];

const STAGES = [
  ["0", "Исходные данные", "Передача Заказчиком справочных данных, проверка комплекта Разработчиком", "Заказчик, +3"],
  ["1", "Согласование", "Состав экранов, оформление, структура кода заказа", "3"],
  ["2", "Справочник и логика", "Перенос данных, реализация правил и алгоритма, автотесты", "4"],
  ["3", "Интерфейс", "Четыре шага, расшифровка кода, вывод результата", "5"],
  ["4", "Выгрузка и отладка", "Печать, ссылка, мобильные устройства, тестирование", "3"],
  ["5", "Ввод в работу", "Развёртывание, исходные коды, документация, инструктаж", "2"],
];

const ACCEPT = [
  "Типовая допустимая конфигурация → верная модель и верный код заказа",
  "Ток отвода выше ряда КОМ или серия без окон отбора → пояснение с числами и предложение исправления",
  "Суммарный ток отводов выше номинала магистрали → фактическое и предельное значение",
  "Материал шин не соответствует серии → предложена замена материала",
  "Ток выше порога при отсутствии рукоятки → предложено добавление рукоятки",
  "Комбинация отсутствует в справочнике → код заблокирован",
  "Применение исправления → проверка пройдена, результат разблокирован",
  "Открытие ссылки на конфигурацию → параметры восстановлены полностью",
  "Печатная форма → параметры, модель, код и рекомендации; кнопки не печатаются",
  "Экран 360 пикселей → всё доступно, горизонтальной прокрутки нет",
];

const NEXT = [
  ["Учётные записи и хранение проектов", "2–3 недели"],
  ["Разделение ролей", "вместе с учётными записями"],
  ["Административный интерфейс справочника", "2 недели"],
  ["Выгрузка в Excel и CSV", "2–3 дня"],
  ["Журнал действий", "3–5 дней"],
  ["Многоязычный интерфейс", "3–5 дней на язык"],
  ["Интеграция с системой заказов", "по результатам обследования"],
];

export default function ScopePage() {
  return (
    <main>
      <PageHero
        eyebrow="Границы работ"
        title="Первый этап — только то, что создаёт ценность"
        lead="Подбор модели, проверка совместимости и формирование кода заказа. Всё остальное вынесено во второй этап и добавляется без переработки уже сделанного."
      >
        <div className="mt-10 rounded-xl2 border border-white/10 bg-white/[0.04] p-5">
          <PipelineScene className="w-full" />
        </div>
      </PageHero>

      {/* входит */}
      <Section>
        <Head eyebrow="Входит в первый этап" title="Одиннадцать функций" lead="Каждая проверяется при приёмке отдельным сценарием." />
        <div className="mt-8 grid gap-2.5 md:grid-cols-2">
          {IN.map(([t, d], i) => (
            <div key={t} className="flex items-start gap-3 rounded-[14px] border border-line bg-surface p-4">
              <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg bg-cur-soft text-cur-d">
                <IconCheck width={14} height={14} strokeWidth={2.4} />
              </span>
              <span>
                <span className="block text-[14px] font-semibold">
                  <span className="mr-2 font-mono text-[11px] text-mute">{String(i + 1).padStart(2, "0")}</span>
                  {t}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-mute">{d}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* не входит */}
      <Section className="border-y border-line bg-surface">
        <Head
          eyebrow="Не входит в первый этап"
          title="Исключено сознательно — с основанием по каждому пункту"
          lead="Каждая из этих функций увеличивает срок и стоимость, но не влияет на корректность подбора."
        />
        <div className="mt-8 grid gap-2.5 md:grid-cols-2">
          {OUT.map(([t, d]) => (
            <div key={t} className="flex items-start gap-3 rounded-[14px] border border-line bg-bg p-4">
              <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg bg-copper/12 text-copper">
                <IconAlert width={14} height={14} strokeWidth={2} />
              </span>
              <span>
                <span className="block text-[14px] font-semibold">{t}</span>
                <span className="mt-0.5 block text-[12.5px] text-mute">{d}</span>
              </span>
            </div>
          ))}
        </div>
        <Card className="mt-6 border-cur/25 bg-cur-soft">
          <div className="flex items-start gap-3">
            <IconServer className="mt-0.5 flex-none text-cur-d" />
            <p className="text-[13.5px] text-ink-2">
              <b>Безопасность.</b> Требования о защите от SQL-инъекций и CSRF относятся к приложениям с серверной
              базой и формами, меняющими состояние на сервере. Здесь нет ни базы, ни серверной обработки ввода —
              эти классы уязвимостей неприменимы. Экранирование обеспечивает фреймворк, передача по HTTPS,
              заголовки CSP настраиваются при развёртывании.
            </p>
          </div>
        </Card>
      </Section>

      {/* этапы */}
      <Section dark>
        <Head dark eyebrow="Этапы работ" title="17 рабочих дней" lead="Отсчёт от даты завершения Этапа 0. Этапы 2 и 3 могут выполняться с частичным совмещением." />
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[#8fb4c0]">
                <th className="pb-3 font-bold">№</th>
                <th className="pb-3 font-bold">Этап</th>
                <th className="pb-3 font-bold">Содержание</th>
                <th className="pb-3 text-right font-bold">Срок, р. д.</th>
              </tr>
            </thead>
            <tbody>
              {STAGES.map(([n, t, d, days]) => (
                <tr key={n} className="border-t border-white/10">
                  <td className="py-3.5 font-mono font-bold text-cur">{n}</td>
                  <td className="py-3.5 pr-4 font-semibold">{t}</td>
                  <td className="py-3.5 pr-4 text-[#8fb4c0]">{d}</td>
                  <td className="py-3.5 text-right font-mono font-bold">{days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 flex items-center gap-2 text-[13px] text-[#8fb4c0]">
          <IconArrow width={16} height={16} className="text-cur" />
          Задержка передачи данных сдвигает срок сдачи на соответствующее число рабочих дней.
        </p>
      </Section>

      {/* приёмка */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Head
              eyebrow="Приёмка"
              title="Десять сценариев, по которым принимается работа"
              lead="Заказчик проверяет результат пять рабочих дней. Замечания по пунктам задания устраняются без дополнительной оплаты."
            />
            <Card className="mt-6">
              <p className="text-[13.5px] text-ink-2">
                <b>Гарантия — 60 календарных дней</b> с даты подписания акта. Не относятся к гарантии: изменение
                справочных данных, изменение требований, ошибки в исходных данных Заказчика, неработоспособность
                хостинга и внешних сервисов.
              </p>
            </Card>
          </div>
          <ol className="grid gap-2">
            {ACCEPT.map((a, i) => (
              <li key={a} className="flex items-start gap-3 rounded-[12px] border border-line bg-surface px-4 py-3 text-[13px]">
                <span className="mt-0.5 font-mono text-[11px] font-bold text-cur-d">{String(i + 1).padStart(2, "0")}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* второй этап */}
      <Section className="border-t border-line bg-surface">
        <Head
          eyebrow="После первого этапа"
          title="Что можно добавить дальше"
          lead="Архитектура выбрана так, чтобы добавление не требовало переработки расчётной части."
        />
        <div className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {NEXT.map(([t, v]) => (
            <div key={t} className="rounded-[14px] border border-line bg-bg p-4">
              <IconLayers className="text-cur-d" />
              <p className="mt-2 text-[14px] font-semibold">{t}</p>
              <p className="mt-1 font-mono text-[12.5px] font-bold text-mute">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Btn href="/demo" variant="primary">Посмотреть демо</Btn>
          <Btn href="/data" variant="ghost">Что нужно от вас</Btn>
        </div>
      </Section>
    </main>
  );
}
