import "server-only";
import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, organizations, sessions, users } from "@/lib/db/schema";
import { issueToken, verifySignature } from "./token";

/**
 * Сессии — раздел 12.2 ТЗ. Тело сессии в базе, чтобы её можно было отозвать;
 * в куке только подписанный идентификатор.
 */

export const SESSION_COOKIE = "klm_session";
/** Активная сессия — 8 часов, «запомнить меня» — 30 дней (ТЗ 12.2.2) */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const SESSION_REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionContext = {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  /** Организации пользователя и роль в каждой */
  memberships: { organizationId: string; organizationName: string; role: string }[];
};

const cookieOptions = (expiresAt: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires: expiresAt,
});

export async function createSession(
  userId: string,
  opts: { ip?: string; userAgent?: string; remember?: boolean } = {},
) {
  const ttl = opts.remember ? SESSION_REMEMBER_TTL_MS : SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);
  const { cookieValue, tokenHash } = issueToken();

  await db.insert(sessions).values({
    userId,
    tokenHash,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent?.slice(0, 500) ?? null,
    expiresAt,
  });

  (await cookies()).set(SESSION_COOKIE, cookieValue, cookieOptions(expiresAt));
  return { expiresAt };
}

/**
 * Чтение сессии: подпись куки, затем поиск в базе с проверкой отзыва и срока.
 * Возвращает null вместо исключения — решение о редиректе принимает слой доступа.
 */
export async function readSession(): Promise<SessionContext | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const tokenHash = verifySignature(raw);
  if (!tokenHash) return null;

  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      tenantId: users.tenantId,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  // заблокированный пользователь не должен ходить по системе со старой кукой
  if (!row.isActive) return null;

  const rows = await db
    .select({
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, row.userId));

  return {
    userId: row.userId,
    tenantId: row.tenantId,
    name: row.name,
    email: row.email,
    memberships: rows,
  };
}

/** Выход: сессия помечается отозванной и кука снимается */
export async function destroySession() {
  const store = await cookies();
  const tokenHash = verifySignature(store.get(SESSION_COOKIE)?.value);
  if (tokenHash)
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, tokenHash));
  store.delete(SESSION_COOKIE);
}

/**
 * Отзыв всех сессий пользователя — при смене пароля, смене роли и блокировке
 * (ТЗ 12.2.4). Текущую сессию можно оставить, передав её хеш.
 */
export async function revokeAllSessions(userId: string, exceptTokenHash?: string) {
  const rows = await db
    .select({ id: sessions.id, tokenHash: sessions.tokenHash })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

  const now = new Date();
  let revoked = 0;
  for (const s of rows) {
    if (exceptTokenHash && s.tokenHash === exceptTokenHash) continue;
    await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, s.id));
    revoked++;
  }
  return revoked;
}
