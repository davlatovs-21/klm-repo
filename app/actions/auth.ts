"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { authenticate, registerUser } from "@/lib/auth/login";
import { createSession, destroySession } from "@/lib/auth/session";
import { verifySession } from "@/lib/dal";
import { writeAudit } from "@/lib/audit";

/**
 * Вход, регистрация и выход. Server Actions выполняются только на сервере
 * и дают встроенную защиту от CSRF (ТЗ 12.3.1).
 */

export type AuthFormState = { error?: string; field?: string } | null;

async function requestContext() {
  const h = await headers();
  return {
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

/** Куда вернуть после входа: только внутренний путь, чтобы форма не стала открытым редиректом */
const safeNext = (value: unknown) => {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/app";
};

export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const ctx = await requestContext();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";
  const next = safeNext(form.get("next"));

  const result = await authenticate(email, password, ctx);
  if (!result.ok) return { error: result.error, field: result.locked ? undefined : "password" };

  await createSession(result.userId, { ...ctx, remember });
  redirect(next);
}

export async function register(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const ctx = await requestContext();

  // тенант в этой версии один; при white-label он определяется по домену запроса
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).limit(1);
  if (!tenant) return { error: "База не наполнена: выполните npm run db:seed" };

  const result = await registerUser(
    {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      name: String(form.get("name") ?? ""),
      company: String(form.get("company") ?? "") || undefined,
    },
    tenant.id,
    ctx,
  );
  if (!result.ok) return { error: result.error, field: result.field };

  await createSession(result.userId, ctx);
  redirect("/app");
}

export async function logout() {
  const ctx = await requestContext();
  const session = await verifySession();
  if (session)
    await writeAudit({
      action: "auth.logout",
      tenantId: session.tenantId,
      actorId: session.userId,
      actorIp: ctx.ip,
      actorUa: ctx.userAgent,
    });

  await destroySession();
  redirect("/login");
}

/** Заглушка на будущее: смена тенанта по домену при white-label */
export async function tenantByDomain(domain: string) {
  const [t] = await db.select().from(tenants).where(eq(tenants.domain, domain)).limit(1);
  return t ?? null;
}
