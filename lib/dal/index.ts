import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, projects } from "@/lib/db/schema";
import type { Role } from "@/lib/db/schema";
import { readSession, type SessionContext } from "@/lib/auth/session";
import { can, type Resource, type Action } from "./permissions";

/**
 * Слой доступа к данным — раздел 12.3.3 ТЗ.
 *
 * Единственная точка, через которую прикладной код получает данные. Каждая функция
 * начинается с проверки сессии и обязательно фильтрует по тенанту и организации.
 * Компоненты в базу не ходят: скрытая в интерфейсе кнопка — это удобство, а не защита.
 *
 * verifySession обёрнут в React cache(): за один проход отрисовки сессия читается
 * из базы один раз, сколько бы компонентов её ни спросило.
 */

export const verifySession = cache(async (): Promise<SessionContext | null> => readSession());

/** Для защищённых страниц: нет сессии — уводим на вход */
export async function requireSession(): Promise<SessionContext> {
  const s = await verifySession();
  if (!s) redirect("/login");
  return s;
}

export class AccessDenied extends Error {
  constructor(message = "Недостаточно прав") {
    super(message);
    this.name = "AccessDenied";
  }
}

/** Роли пользователя во всех его организациях */
export const rolesOf = (s: SessionContext): Role[] => s.memberships.map((m) => m.role as Role);

/** Проверка права по матрице раздела 11.2 */
export async function requirePermission(resource: Resource, action: Action): Promise<SessionContext> {
  const s = await requireSession();
  if (!rolesOf(s).some((role) => can(role, resource, action)))
    throw new AccessDenied(`Нет права ${resource}:${action}`);
  return s;
}

/** Идентификаторы организаций, данные которых пользователю видны */
const visibleOrgIds = (s: SessionContext) => s.memberships.map((m) => m.organizationId);

/**
 * Проекты пользователя. Фильтр по тенанту и по организациям — не по одному из двух:
 * без фильтра по организации участник одного тенанта видел бы чужие объекты.
 */
export async function listProjects(limit = 50) {
  const s = await requirePermission("project", "read");
  const orgIds = visibleOrgIds(s);
  if (orgIds.length === 0) return [];

  return db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      customerName: projects.customerName,
      source: projects.source,
      createdAt: projects.createdAt,
      organizationName: organizations.name,
    })
    .from(projects)
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(
      and(
        eq(projects.tenantId, s.tenantId),
        inArray(projects.organizationId, orgIds),
        isNull(projects.archivedAt),
      ),
    )
    .orderBy(desc(projects.createdAt))
    .limit(limit);
}

/**
 * Проект по идентификатору. Возвращает null, а не бросает: страница отдаёт 404,
 * чтобы по ответу нельзя было понять, существует ли чужой проект (ТЗ M2, защита от IDOR).
 */
export async function getProject(id: string) {
  const s = await requirePermission("project", "read");
  const orgIds = visibleOrgIds(s);
  if (orgIds.length === 0) return null;

  const [row] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, id),
        eq(projects.tenantId, s.tenantId),
        inArray(projects.organizationId, orgIds),
      ),
    )
    .limit(1);

  return row ?? null;
}

export type { Resource, Action };
