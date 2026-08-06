import type { Metadata } from "next";
import { Section, Head } from "@/components/ui";
import { COMPANY } from "@/lib/core/klm-catalog";

export const metadata: Metadata = {
  title: "Обработка персональных данных · КЛМ",
  robots: { index: false, follow: false },
};

export default function PolicyPage() {
  return (
    <main>
      <Section>
        <Head
          eyebrow="Прототип"
          title="Политика обработки персональных данных"
          lead="Страница-заготовка. Юридический текст готовит юрист ООО «КЛМ» — это обязательство Заказчика по разделу 24 ТЗ, вопрос 12."
        />

        <div className="mt-8 rounded-xl2 border border-fault/30 bg-fault-soft p-5">
          <p className="text-[13px] font-bold text-fault">Что нужно знать до промышленного запуска</p>
          <ul className="mt-2.5 grid gap-2 text-[13.5px] leading-relaxed text-ink">
            <li>
              Форма заявки в этой версии <b>не сохраняет данные в базу</b>: таблиц ещё нет, заявка уходит
              в технический журнал приложения. Собирать персональные данные в промышленной эксплуатации
              нельзя, пока не выполнены три условия ниже.
            </li>
            <li>
              <b>Размещение в Российской Федерации.</b> Требование 152-ФЗ. Основная база не может стоять
              на зарубежной площадке — раздел 12.5 ТЗ.
            </li>
            <li>
              <b>Уведомление в Роскомнадзор</b> об обработке персональных данных — обязанность Заказчика.
            </li>
            <li>
              <b>Согласованный юристом текст</b> политики и формы согласия, ссылки во всех формах.
            </li>
          </ul>
        </div>

        <div className="mt-8 grid gap-6 text-[14px] leading-relaxed text-ink-2 sm:max-w-3xl">
          <div>
            <h2 className="display text-[18px] text-ink">Кто обрабатывает данные</h2>
            <p className="mt-2">
              {COMPANY.name} ({COMPANY.alt}), запись в реестре {COMPANY.registry}, производство —{" "}
              {COMPANY.plant}. Связь: {COMPANY.phone}, {COMPANY.email}, {COMPANY.hours}.
            </p>
          </div>

          <div>
            <h2 className="display text-[18px] text-ink">Какие данные и зачем</h2>
            <p className="mt-2">
              Имя, телефон или адрес электронной почты, название компании и объекта, текст обращения —
              чтобы ответить на заявку на расчёт и подготовить коммерческое предложение. Вместе с заявкой
              передаются исходные данные расчёта и метки перехода на сайт.
            </p>
          </div>

          <div>
            <h2 className="display text-[18px] text-ink">Оговорка об ответственности за расчёт</h2>
            <p className="mt-2">
              Результат расчёта носит предварительный характер. Окончательное решение принимает проектная
              организация. Расчёт не заменяет проект, выполненный в соответствии с действующими нормами.
              Точная формулировка согласуется с юристом Заказчика — раздел 12.5 ТЗ, пункт 6.
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}
