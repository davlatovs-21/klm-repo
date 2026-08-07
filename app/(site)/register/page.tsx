import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Регистрация · КЛМ", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <RegisterForm />
      <p className="mt-4 text-center text-[11.5px] leading-snug text-mute">
        Создавая учётную запись, вы соглашаетесь на обработку персональных данных на условиях{" "}
        <Link href="/policy" className="font-semibold text-cur-d underline decoration-cur/40 underline-offset-2">
          политики обработки
        </Link>
        .
      </p>
    </main>
  );
}
