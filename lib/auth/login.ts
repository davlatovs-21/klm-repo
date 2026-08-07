import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, organizations, users } from "@/lib/db/schema";
import { checkPasswordStrength, hashPassword, verifyPassword } from "./password";
import { writeAudit } from "@/lib/audit";

/**
 * Проверка учётных данных и заведение пользователя.
 * Вынесено из Server Action, чтобы проверяться тестами против настоящей базы:
 * в действии остаётся только запросный контекст и установка куки.
 */

/** Блокировка после пяти неудачных попыток на 15 минут (ТЗ 12.1.5) */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export type LoginOutcome =
  | { ok: true; userId: string; tenantId: string }
  | { ok: false; error: string; locked?: boolean };

export type AuthContext = { ip?: string; userAgent?: string; now?: number };

/**
 * Один и тот же текст на «нет такого пользователя» и «неверный пароль»:
 * иначе форма превращается в способ перебирать существующие адреса.
 */
const WRONG = "Неверный адрес или пароль";

export async function authenticate(
  email: string,
  password: string,
  ctx: AuthContext = {},
): Promise<LoginOutcome> {
  const now = ctx.now ?? Date.now();
  const normalized = email.trim().toLowerCase();

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, normalized), isNull(users.archivedAt)))
    .limit(1);

  if (!user) {
    await writeAudit({ action: "auth.login_failed", actorIp: ctx.ip, actorUa: ctx.userAgent, after: { email: normalized } });
    return { ok: false, error: WRONG };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > now) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - now) / 60000);
    return { ok: false, error: `Учётная запись временно заблокирована, попробуйте через ${minutes} мин`, locked: true };
  }

  if (!user.isActive) return { ok: false, error: "Учётная запись отключена" };

  if (!(await verifyPassword(user.passwordHash, password))) {
    const failed = user.failedAttempts + 1;
    const lock = failed >= MAX_FAILED_ATTEMPTS;
    await db
      .update(users)
      .set({ failedAttempts: failed, lockedUntil: lock ? new Date(now + LOCK_MS) : user.lockedUntil })
      .where(eq(users.id, user.id));

    await writeAudit({
      action: lock ? "auth.locked" : "auth.login_failed",
      tenantId: user.tenantId,
      actorId: user.id,
      actorIp: ctx.ip,
      actorUa: ctx.userAgent,
      after: { failedAttempts: failed },
    });

    return lock
      ? { ok: false, error: `Пять неудачных попыток подряд. Вход заблокирован на ${LOCK_MS / 60000} мин`, locked: true }
      : { ok: false, error: WRONG };
  }

  await db
    .update(users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date(now) })
    .where(eq(users.id, user.id));

  await writeAudit({
    action: "auth.login",
    tenantId: user.tenantId,
    actorId: user.id,
    actorIp: ctx.ip,
    actorUa: ctx.userAgent,
    entityType: "user",
    entityId: user.id,
  });

  return { ok: true, userId: user.id, tenantId: user.tenantId };
}

export type RegisterOutcome = { ok: true; userId: string } | { ok: false; error: string; field?: string };

/**
 * Регистрация клиента: заводится пользователь и его организация.
 * Подтверждение почты и модерация менеджером (ТЗ M10.2) — отдельным шагом,
 * учётная запись создаётся сразу активной, но без подтверждённой почты.
 */
export async function registerUser(
  input: { email: string; password: string; name: string; company?: string },
  tenantId: string,
  ctx: AuthContext = {},
): Promise<RegisterOutcome> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (name.length < 2) return { ok: false, error: "Укажите имя", field: "name" };
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email))
    return { ok: false, error: "Неверный адрес электронной почты", field: "email" };

  const strength = checkPasswordStrength(input.password);
  if (!strength.ok) return { ok: false, error: strength.error, field: "password" };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, email)))
    .limit(1);
  if (existing) return { ok: false, error: "Такой адрес уже зарегистрирован", field: "email" };

  const passwordHash = await hashPassword(input.password);

  const [user] = await db.insert(users).values({ tenantId, email, name, passwordHash }).returning();

  const [org] = await db
    .insert(organizations)
    .values({ tenantId, name: input.company?.trim() || name, type: "client" })
    .returning();

  await db.insert(memberships).values({ userId: user.id, organizationId: org.id, role: "client" });

  await writeAudit({
    action: "auth.register",
    tenantId,
    actorId: user.id,
    actorIp: ctx.ip,
    actorUa: ctx.userAgent,
    entityType: "user",
    entityId: user.id,
    after: { email, organization: org.name },
  });

  return { ok: true, userId: user.id };
}
