import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Вход · КЛМ", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <LoginForm next={next} />
    </main>
  );
}
