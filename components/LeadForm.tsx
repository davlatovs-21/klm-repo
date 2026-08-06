"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendLead } from "@/app/actions/lead";
import { IconAlert, IconCheck } from "./icons";

/** Поля мастера, которые уходят вместе с заявкой, чтобы менеджер не пересчитывал заново */
export type LeadContext = {
  calcQuery: string;
  calcSummary: string;
  dealer?: string;
  source: "calc" | "widget";
  utm: Record<string, string>;
};

function Field({
  name, label, type = "text", required, placeholder, autoComplete,
}: {
  name: string; label: string; type?: string; required?: boolean; placeholder?: string; autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-semibold leading-tight text-mute">
        {label}
        {required && <span className="ml-0.5 text-fault">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="rounded-xl border-[1.5px] border-line bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-cur"
      />
    </label>
  );
}

export default function LeadForm({ ctx }: { ctx: LeadContext }) {
  const [state, action, pending] = useActionState(sendLead, null);

  if (state?.ok)
    return (
      <div className="rounded-xl2 border border-cur/30 bg-cur-soft p-5">
        <p className="flex items-center gap-2 text-[14px] font-bold text-cur-d">
          <IconCheck className="h-4 w-4" />
          Заявка принята
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          Инженер получит исходные данные вместе с этим расчётом и вернётся с точной ценой
          и спецификацией. Ссылку на расчёт можно сохранить — она в адресной строке.
        </p>
      </div>
    );

  return (
    <form action={action} className="rounded-xl2 border border-line bg-surface p-4 sm:p-5">
      <h3 className="display text-[17px]">Получить точную цену и спецификацию</h3>
      <p className="mt-1.5 text-[12.5px] leading-snug text-mute">
        Расчёт выше — предварительный. Инженер КЛМ проверит его, соберёт спецификацию по трассе
        и посчитает стоимость.
      </p>

      {/* контекст расчёта уходит скрытыми полями */}
      <input type="hidden" name="calcQuery" value={ctx.calcQuery} />
      <input type="hidden" name="calcSummary" value={ctx.calcSummary} />
      <input type="hidden" name="source" value={ctx.source} />
      {ctx.dealer && <input type="hidden" name="dealer" value={ctx.dealer} />}
      {Object.entries(ctx.utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {/* ловушка для ботов: настоящий человек этого поля не видит */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Сайт
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field name="name" label="Как к вам обращаться" required autoComplete="name" placeholder="Иванов Пётр" />
        <Field name="contact" label="Телефон или почта" required autoComplete="tel" placeholder="+7 999 123-45-67" />
        <Field name="company" label="Компания" autoComplete="organization" placeholder="ПроектСтрой" />
        <Field name="objectName" label="Объект" placeholder="Цех №2, Владимир" />
      </div>

      <label className="mt-3 flex flex-col gap-1">
        <span className="text-[11.5px] font-semibold leading-tight text-mute">Что уточнить</span>
        <textarea
          name="comment"
          rows={3}
          placeholder="Особенности трассы, сроки, требования проекта"
          className="rounded-xl border-[1.5px] border-line bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-cur"
        />
      </label>

      <label className="mt-4 flex items-start gap-2.5 text-[12.5px] leading-snug">
        <input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-cur)]" />
        <span className="text-ink-2">
          Согласен на обработку персональных данных на условиях{" "}
          <Link href="/policy" target="_blank" className="font-semibold text-cur-d underline decoration-cur/40 underline-offset-2">
            политики обработки
          </Link>
          .
        </span>
      </label>

      {state && !state.ok && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-[12px] bg-fault-soft px-3 py-2.5 text-[12.5px] font-semibold text-fault">
          <IconAlert className="mt-0.5 h-4 w-4 flex-none" />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-full bg-cur px-5 py-3 text-[14px] font-bold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Отправляем…" : "Отправить заявку"}
      </button>

      <p className="mt-3 text-[11px] leading-snug text-mute">
        Файл планировки пока не принимаем — нужно объектное хранилище с проверкой вложений.
        Опишите объект в поле выше, инженер запросит чертёж письмом.
      </p>
    </form>
  );
}
