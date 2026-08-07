"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, register, type AuthFormState } from "@/app/actions/auth";
import { IconAlert } from "./icons";

function Field({
  name, label, type = "text", required, autoComplete, hint, defaultValue,
}: {
  name: string; label: string; type?: string; required?: boolean;
  autoComplete?: string; hint?: string; defaultValue?: string;
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
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="rounded-xl border-[1.5px] border-line bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-cur"
      />
      {hint && <span className="text-[10.5px] leading-snug text-mute">{hint}</span>}
    </label>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(login, null);

  return (
    <form action={action} className="rounded-xl2 border border-line bg-surface p-5">
      <h1 className="display text-[20px]">Вход</h1>
      <p className="mb-4 mt-1 text-[13px] text-mute">Кабинет проектов и расчётов</p>

      {next && <input type="hidden" name="next" value={next} />}

      <div className="grid gap-3">
        <Field name="email" label="Электронная почта" type="email" required autoComplete="email" />
        <Field name="password" label="Пароль" type="password" required autoComplete="current-password" />
      </div>

      <label className="mt-3 flex items-center gap-2 text-[12.5px]">
        <input name="remember" type="checkbox" className="h-4 w-4 accent-[var(--color-cur)]" />
        <span className="text-ink-2">Запомнить на 30 дней</span>
      </label>

      {state?.error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-[12px] bg-fault-soft px-3 py-2.5 text-[12.5px] font-semibold text-fault">
          <IconAlert className="mt-0.5 h-4 w-4 flex-none" />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-full bg-ink px-5 py-3 text-[14px] font-bold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 disabled:opacity-50"
      >
        {pending ? "Проверяем…" : "Войти"}
      </button>

      <p className="mt-4 text-center text-[12.5px] text-mute">
        Нет учётной записи?{" "}
        <Link href="/register" className="font-semibold text-cur-d underline decoration-cur/40 underline-offset-2">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(register, null);

  return (
    <form action={action} className="rounded-xl2 border border-line bg-surface p-5">
      <h1 className="display text-[20px]">Регистрация</h1>
      <p className="mb-4 mt-1 text-[13px] text-mute">
        Кабинет с историей расчётов, спецификациями и коммерческими предложениями
      </p>

      <div className="grid gap-3">
        <Field name="name" label="Имя" required autoComplete="name" />
        <Field name="company" label="Компания" autoComplete="organization" hint="станет вашей организацией в системе" />
        <Field name="email" label="Электронная почта" type="email" required autoComplete="email" />
        <Field
          name="password"
          label="Пароль"
          type="password"
          required
          autoComplete="new-password"
          hint="не короче 12 символов; длина надёжнее правил про спецсимволы"
        />
      </div>

      {state?.error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-[12px] bg-fault-soft px-3 py-2.5 text-[12.5px] font-semibold text-fault">
          <IconAlert className="mt-0.5 h-4 w-4 flex-none" />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-full bg-cur px-5 py-3 text-[14px] font-bold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 disabled:opacity-50"
      >
        {pending ? "Создаём…" : "Создать учётную запись"}
      </button>

      <p className="mt-4 text-center text-[12.5px] text-mute">
        Уже есть учётная запись?{" "}
        <Link href="/login" className="font-semibold text-cur-d underline decoration-cur/40 underline-offset-2">
          Войти
        </Link>
      </p>
    </form>
  );
}
