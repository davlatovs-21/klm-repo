import Link from "next/link";
import CodeAnatomy from "@/components/CodeAnatomy";
import { Section, Head, Card, Btn } from "@/components/ui";
import { BusbarScene, PipelineScene } from "@/components/Illustrations";
import {
  IconClock, IconCode, IconFactory, IconBus, IconTap, IconShield, IconGauge,
  IconServer, IconLayers, IconBolt,
} from "@/components/icons";

const PAIN = [
  {
    Ico: IconClock,
    t: "10–20 минут на позицию",
    d: "Инженер сверяет серию, ток магистрали, ток отвода, тип установки, аппарат защиты и IP по нескольким таблицам печатного каталога.",
  },
  {
    Ico: IconCode,
    t: "Девять позиций вручную",
    d: "Код заказа собирается символ за символом. Одна перепутанная позиция — и в заказ уходит другое изделие.",
  },
  {
    Ico: IconFactory,
    t: "Ошибка всплывает на заводе",
    d: "Несовместимость обнаруживается на производстве или при поставке: пересогласование, срыв отгрузки, прямые потери.",
  },
];

const METRICS = [
  { k: "Время подбора одной позиции", now: "10–20 мин", after: "менее 1 мин" },
  { k: "Проверка совместимости", now: "вручную, выборочно", after: "автоматически, 100 % правил" },
  { k: "Формирование кода заказа", now: "вручную", after: "автоматически" },
  { k: "Вероятность ошибки в артикуле", now: "не контролируется", after: "исключена в пределах справочника" },
];

const STEPS = [
  { n: "01", Ico: IconBus, t: "Шинопровод", d: "Серия, ток магистрали, материал шин, число проводников, IP трассы. Смена серии сама приводит зависимые параметры к допустимым." },
  { n: "02", Ico: IconTap, t: "Отвод", d: "Тип установки, ток отвода, число отводов, аппарат защиты, рукоятка, IP корпуса. Недопустимое видно, но неактивно." },
  { n: "03", Ico: IconShield, t: "Проверка", d: "Девять правил справочника с числами в формулировке нарушения и кнопкой исправления на один клик." },
  { n: "04", Ico: IconGauge, t: "Результат", d: "Модель, код заказа, загрузка корпуса по току, габарит и масса, рекомендации по монтажу, печать и ссылка." },
];

const RULES = [
  ["Материал шин", "допустим для серии"],
  ["Тип установки", "поддерживается серией"],
  ["Число проводников", "соответствует серии"],
  ["Предел тока отвода", "не выше потолка серии"],
  ["Нагрузка на магистраль", "сумма отводов в пределах доли"],
  ["Аппарат защиты", "применим при этом токе"],
  ["Рукоятка управления", "обязательна выше порога"],
  ["Степень защиты", "IP корпуса не ниже IP трассы"],
  ["Наличие модели", "позиция существует в справочнике"],
];

const FEATURES = [
  "Ввод параметров шинопровода",
  "Ввод параметров отвода",
  "Проверка совместимости",
  "Автоматическое исправление",
  "Подбор модели КОМ",
  "Формирование кода заказа",
  "Рекомендации по монтажу",
  "Копирование кода одним нажатием",
  "Печатная форма и PDF",
  "Ссылка на конфигурацию",
  "Работа на телефоне и ПК",
];

const ARCH = [
  { Ico: IconServer, t: "Нет сервера и базы данных", d: "Стоимость эксплуатации равна размещению статического сайта." },
  { Ico: IconBolt, t: "Расчёт в браузере", d: "Отклик на изменение параметра — до 100 мс, требование выполняется с запасом на порядок." },
  { Ico: IconShield, t: "Нет серверной обработки ввода", d: "Целые классы уязвимостей просто неприменимы к такой архитектуре." },
  { Ico: IconLayers, t: "Справочник — отдельный файл", d: "Замена условных данных на реальные не затрагивает интерфейс." },
];

const STAGES = [
  { n: "0", t: "Исходные данные", d: "Заказчик передаёт справочник, разработчик проверяет комплект", days: "+3 р. д." },
  { n: "1", t: "Согласование", d: "Состав экранов, оформление, структура кода заказа", days: "3 р. д." },
  { n: "2", t: "Справочник и логика", d: "Правила, алгоритм подбора, автоматические тесты", days: "4 р. д." },
  { n: "3", t: "Интерфейс", d: "Четыре шага, расшифровка кода, вывод результата", days: "5 р. д." },
  { n: "4", t: "Выгрузка и отладка", d: "Печать, ссылка, мобильные устройства, тестирование", days: "3 р. д." },
  { n: "5", t: "Ввод в работу", d: "Развёртывание, исходные коды, документация, инструктаж", days: "2 р. д." },
];

export default function Home() {
  return (
    <main>
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="busgrid relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -right-32 -top-52 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(0,174,192,0.4),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(180,112,58,0.22),transparent_65%)]" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-5 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
          <div className="anim-up">
            <p className="eyebrow text-cur">Онлайн-панель подбора КОМ · шинопровод KLM</p>
            <h1 className="display mt-4 text-[clamp(32px,5.6vw,56px)] leading-[1.05]">
              Код заказа КОМ<br />
              за минуту.<br />
              <span className="text-cur">Без ошибки.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] text-[#8fb4c0] sm:text-[17px]">
              Инженер вводит параметры трассы и отвода. Панель проверяет конфигурацию по девяти правилам
              справочника, подбирает минимальный достаточный корпус и собирает артикул из девяти позиций.
              Недопустимая конфигурация в заказ не уходит.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href="/demo" variant="cur">Открыть демо →</Btn>
              <Btn href="/podbor" variant="ghost">Выбор шинопровода</Btn>
            </div>
            <p className="mt-4 text-[12.5px] text-[#61798a]">
              Панель <Link href="/podbor" className="font-semibold text-cur underline decoration-cur/40 underline-offset-4">выбора шинопровода</Link>{" "}
              работает на реальном каталоге КЛМ: расчёт тока, серия, номинал, коробки отбора.
            </p>

            <dl className="mt-9 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 sm:gap-4">
              {[
                ["17", "рабочих дней до сдачи"],
                ["9", "правил проверки"],
                ["0", "серверов в эксплуатации"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="display text-[clamp(24px,4vw,34px)] text-cur">{v}</dt>
                  <dd className="mt-1 text-[12.5px] leading-snug text-[#8fb4c0]">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="anim-up [animation-delay:120ms]">
            <BusbarScene taps={2} tapCurrent={63} busCurrent={630} dark className="w-full" />
            <div className="mt-4">
              <CodeAnatomy dark />
            </div>
            <p className="mt-4 text-center text-[12px] text-[#61798a]">
              Живой артикул достраивается по мере ввода параметров
            </p>
          </div>
        </div>
      </section>

      {/* ── ПРОБЛЕМА ───────────────────────────────────────── */}
      <Section>
        <Head
          eyebrow="Как это работает сейчас"
          title="Подбор по печатному каталогу стоит времени и денег"
          lead="Ошибка в артикуле не проверяется никем до момента производства."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PAIN.map((p, i) => (
            <Card key={p.t} className="anim-up">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-copper/10 text-copper">
                  <p.Ico width={22} height={22} />
                </span>
                <span className="display text-[13px] text-line-2">0{i + 1}</span>
              </div>
              <h3 className="display mt-4 text-[17px]">{p.t}</h3>
              <p className="mt-2 text-[14px] text-mute">{p.d}</p>
            </Card>
          ))}
        </div>

        {/* метрики */}
        <div className="mt-10 overflow-hidden rounded-xl2 border border-line bg-surface sm:mt-12">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr] gap-3 border-b border-line bg-[#f4f8f9] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-mute sm:grid">
            <span>Показатель</span>
            <span>Сейчас</span>
            <span className="text-cur-d">После внедрения</span>
          </div>
          {METRICS.map((m) => (
            <div
              key={m.k}
              className="grid gap-1 border-b border-line px-4 py-4 text-[13.5px] last:border-0 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-center sm:gap-3 sm:px-5"
            >
              <span className="font-semibold">{m.k}</span>
              <span className="flex items-center gap-2 text-mute sm:block">
                <span className="eyebrow w-14 flex-none text-[9px] text-line-2 sm:hidden">Сейчас</span>
                <span className="line-through decoration-line-2">{m.now}</span>
              </span>
              <span className="flex items-center gap-2 sm:block">
                <span className="eyebrow w-14 flex-none text-[9px] text-line-2 sm:hidden">Станет</span>
                <span className="font-mono font-bold text-cur-d">{m.after}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── ЧЕТЫРЕ ШАГА ────────────────────────────────────── */}
      <Section dark>
        <Head
          dark
          eyebrow="Порядок работы"
          title="Четыре шага. Дальше следующего нельзя, пока текущий не сходится"
          lead="Возврат к любому пройденному шагу — в любой момент. Код заказа виден на всех шагах."
        />
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl2 border border-white/10 bg-white/[0.04] p-5 transition-colors duration-300 hover:border-cur/60">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cur/12 text-cur">
                  <s.Ico width={20} height={20} />
                </span>
                <span className="font-mono text-[12px] font-bold text-cur">{s.n}</span>
              </div>
              <h3 className="display mt-3 text-[17px]">{s.t}</h3>
              <p className="mt-2 text-[13.5px] text-[#8fb4c0]">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-xl2 border border-white/10 bg-white/[0.04] p-5">
          <PipelineScene className="w-full" />
        </div>
        <div className="mt-8">
          <Btn href="/demo" variant="cur">Пройти все четыре шага →</Btn>
        </div>
      </Section>

      {/* ── ПРАВИЛА ────────────────────────────────────────── */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <Head
              eyebrow="Проверка совместимости"
              title="Девять правил справочника, а не память инженера"
              lead="При нарушении панель показывает конкретные числа и кнопку, которая приводит параметр к ближайшему допустимому значению. Переход к результату заблокирован, пока нарушение не устранено."
            />
            <div className="mt-6 rounded-xl2 border border-fault/25 bg-fault-soft p-5">
              <p className="text-[13px] font-bold text-fault">Пример формулировки нарушения</p>
              <p className="mt-2 text-[14px] text-ink">
                «Потолок отвода для KLM-S — 100 А, запрошено 250 А»
                <span className="ml-2 inline-block rounded-full bg-fault px-3 py-1 text-[12px] font-bold text-white">
                  Снизить до 100 А
                </span>
              </p>
            </div>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {RULES.map(([t, d], i) => (
              <li key={t} className="flex items-start gap-3 rounded-[14px] border border-line bg-surface p-4">
                <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg bg-cur-soft font-mono text-[11px] font-bold text-cur-d">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold">{t}</span>
                  <span className="block text-[12.5px] text-mute">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ── ФУНКЦИИ ────────────────────────────────────────── */}
      <Section className="border-y border-line bg-surface">
        <Head
          eyebrow="Первый этап"
          title="Одиннадцать функций, каждая проверяется при приёмке"
          lead="Всё, что создаёт ценность, входит в первый выпуск. Личный кабинет, роли и администрирование справочника вынесены во второй этап сознательно."
        />
        <div className="mt-8 flex flex-wrap gap-2.5">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="rounded-full border border-line bg-bg px-4 py-2 text-[13.5px] font-semibold transition-colors duration-300 hover:border-cur hover:text-cur-d"
            >
              {f}
            </span>
          ))}
        </div>
        <p className="mt-6 text-[13.5px] text-mute">
          Что исключено из первого этапа и почему —{" "}
          <Link href="/scope" className="font-bold text-cur-d underline decoration-cur/40 underline-offset-4">
            на странице объёма работ
          </Link>
          .
        </p>
      </Section>

      {/* ── АРХИТЕКТУРА ────────────────────────────────────── */}
      <Section dark>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <Head
              dark
              eyebrow="Архитектура"
              title="Статическое приложение. Весь расчёт — в браузере"
              lead="React и TypeScript, справочник в виде файла данных, включаемого в сборку. Проверка структуры справочника на этапе сборки: несоответствие обрывает сборку, а не всплывает у пользователя."
            />
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                ["≤ 100 мс", "отклик на изменение параметра"],
                ["≤ 2 с", "первая загрузка, широкополосное"],
                ["≤ 5 с", "первая загрузка, 3G"],
                ["≤ 500 КБ", "объём первой загрузки"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="display text-[20px] text-cur">{v}</p>
                  <p className="mt-1 text-[12px] text-[#8fb4c0]">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <ul className="grid content-start gap-3">
            {ARCH.map((a) => (
              <li key={a.t} className="flex items-start gap-4 rounded-[14px] border border-white/10 bg-white/[0.04] p-5">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-cur/12 text-cur">
                  <a.Ico width={20} height={20} />
                </span>
                <span>
                  <span className="block text-[14.5px] font-bold">{a.t}</span>
                  <span className="mt-1 block text-[13.5px] text-[#8fb4c0]">{a.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ── СРОКИ ──────────────────────────────────────────── */}
      <Section>
        <Head
          eyebrow="Сроки"
          title="17 рабочих дней от передачи справочника до работающего адреса"
          lead="Отсчёт начинается с даты завершения Этапа 0 — приёмки справочных данных. Этапы 2 и 3 могут идти с частичным совмещением."
        />
        <ol className="mt-10 grid gap-3 md:grid-cols-2">
          {STAGES.map((s) => (
            <li key={s.n} className="flex items-start gap-4 rounded-xl2 border border-line bg-surface p-5">
              <span
                className={`grid h-9 w-9 flex-none place-items-center rounded-xl font-mono text-[13px] font-bold ${
                  s.n === "0" ? "bg-copper/12 text-copper" : "bg-ink text-cur"
                }`}
              >
                {s.n}
              </span>
              <span className="flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="display text-[16px]">{s.t}</span>
                  <span className="font-mono text-[12.5px] font-bold text-cur-d">{s.days}</span>
                </span>
                <span className="mt-1 block text-[13px] text-mute">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="busgrid relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -right-20 -top-32 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(0,174,192,0.35),transparent_65%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 text-center sm:px-5 sm:py-20">
          <h2 className="display mx-auto max-w-3xl text-[clamp(26px,4.4vw,42px)] leading-[1.1]">
            Посмотрите, как это работает, на условных данных
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] text-[#8fb4c0]">
            Демо содержит рабочую логику подбора: те же четыре шага, те же девять правил, тот же формат артикула.
            Реальный справочник подставляется без изменения интерфейса.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Btn href="/demo" variant="cur">Открыть демо</Btn>
            <Btn href="/data" variant="ghost">Что нужно от вас</Btn>
          </div>
        </div>
      </section>
    </main>
  );
}
