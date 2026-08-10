import "server-only";
import { and, desc, eq, inArray, isNull, sql as raw } from "drizzle-orm";
import { db } from "@/lib/db";
import { configurations, configVersions, projects } from "@/lib/db/schema";
import { requirePermission, AccessDenied } from "./index";
import { writeAudit } from "@/lib/audit";
import { analyzeRoute, type Route } from "@/lib/core/route";
import type { SessionContext } from "@/lib/auth/session";

/**
 * Конфигурации трассы — хранение и версии, ТЗ M2.4 и M3.8.
 *
 * Каждое сохранение создаёт версию: видна история, автор, время, комментарий.
 * Снимок результата кладётся целиком (ТЗ 10.2.5) — конфигурация годичной
 * давности должна открываться и печататься даже после смены справочника.
 */

/** Проект, в который складываются черновики конструктора, пока объекта нет */
export const DRAFTS_PROJECT = "Черновики трасс";

const orgIdsOf = (s: SessionContext) => s.memberships.map((m) => m.organizationId);

/**
 * Конфигурация, с которой работает пользователь. Создаётся при первом заходе:
 * заставлять заводить проект прежде, чем что-то нарисовано, — лишний шаг.
 * Привязка к настоящему проекту появится вместе с карточкой проекта.
 */
export async function getOrCreateDraftConfiguration() {
  const s = await requirePermission("configuration", "update");
  const orgIds = orgIdsOf(s);
  if (orgIds.length === 0) throw new AccessDenied("Пользователь не состоит ни в одной организации");
  const organizationId = orgIds[0];

  const [existingProject] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.tenantId, s.tenantId),
        eq(projects.organizationId, organizationId),
        eq(projects.name, DRAFTS_PROJECT),
        isNull(projects.archivedAt),
      ),
    )
    .limit(1);

  const project =
    existingProject ??
    (
      await db
        .insert(projects)
        .values({
          tenantId: s.tenantId,
          organizationId,
          name: DRAFTS_PROJECT,
          status: "calculating",
          source: "manual",
          createdBy: s.userId,
        })
        .returning()
    )[0];

  const [existing] = await db
    .select()
    .from(configurations)
    .where(and(eq(configurations.projectId, project.id), isNull(configurations.archivedAt)))
    .orderBy(desc(configurations.createdAt))
    .limit(1);

  if (existing) return { session: s, project, configuration: existing };

  const [configuration] = await db
    .insert(configurations)
    .values({ projectId: project.id, name: "Трасса", duty: "distribution", createdBy: s.userId })
    .returning();

  return { session: s, project, configuration };
}

/** Конфигурация по идентификатору с проверкой владения — защита от IDOR */
async function ownedConfiguration(configurationId: string, s: SessionContext) {
  const orgIds = orgIdsOf(s);
  if (orgIds.length === 0) return null;

  const [row] = await db
    .select({ configuration: configurations, project: projects })
    .from(configurations)
    .innerJoin(projects, eq(projects.id, configurations.projectId))
    .where(
      and(
        eq(configurations.id, configurationId),
        eq(projects.tenantId, s.tenantId),
        inArray(projects.organizationId, orgIds),
      ),
    )
    .limit(1);

  return row ?? null;
}

export type SavedVersion = {
  id: string;
  versionNo: number;
  comment: string | null;
  createdAt: Date;
  authorId: string | null;
};

/**
 * Новая версия конфигурации. Номер берётся от текущего максимума в одной
 * транзакции с вставкой: два одновременных сохранения не должны получить
 * один номер, а уникальный индекс не даст этому пройти незамеченным.
 */
export async function saveRouteVersion(
  configurationId: string,
  route: Route,
  comment?: string,
): Promise<SavedVersion> {
  const s = await requirePermission("configuration", "update");
  const owned = await ownedConfiguration(configurationId, s);
  if (!owned) throw new AccessDenied("Конфигурация не найдена");

  const result = analyzeRoute(route);

  const saved = await db.transaction(async (tx) => {
    const [{ max }] = await tx
      .select({ max: raw<number>`coalesce(max(${configVersions.versionNo}), 0)` })
      .from(configVersions)
      .where(eq(configVersions.configurationId, configurationId));

    const [version] = await tx
      .insert(configVersions)
      .values({
        configurationId,
        versionNo: Number(max) + 1,
        routeJson: route,
        // снимок результата целиком: справочник может измениться, версия — нет
        resultJson: result,
        comment: comment ?? null,
        authorId: s.userId,
      })
      .returning();

    await tx
      .update(configurations)
      .set({ currentVersionId: version.id })
      .where(eq(configurations.id, configurationId));

    return version;
  });

  await writeAudit({
    action: "config.updated",
    tenantId: s.tenantId,
    actorId: s.userId,
    entityType: "configuration",
    entityId: configurationId,
    after: { versionNo: saved.versionNo, totalLengthM: result.totalLengthM, totalItems: result.totalItems },
  });

  return {
    id: saved.id,
    versionNo: saved.versionNo,
    comment: saved.comment,
    createdAt: saved.createdAt,
    authorId: saved.authorId,
  };
}

export async function listRouteVersions(configurationId: string, limit = 20): Promise<SavedVersion[]> {
  const s = await requirePermission("configuration", "read");
  if (!(await ownedConfiguration(configurationId, s))) return [];

  return db
    .select({
      id: configVersions.id,
      versionNo: configVersions.versionNo,
      comment: configVersions.comment,
      createdAt: configVersions.createdAt,
      authorId: configVersions.authorId,
    })
    .from(configVersions)
    .where(eq(configVersions.configurationId, configurationId))
    .orderBy(desc(configVersions.versionNo))
    .limit(limit);
}

/** Геометрия конкретной версии — для восстановления и сравнения */
export async function getRouteVersion(configurationId: string, versionId: string): Promise<Route | null> {
  const s = await requirePermission("configuration", "read");
  if (!(await ownedConfiguration(configurationId, s))) return null;

  const [row] = await db
    .select({ routeJson: configVersions.routeJson })
    .from(configVersions)
    .where(and(eq(configVersions.id, versionId), eq(configVersions.configurationId, configurationId)))
    .limit(1);

  return (row?.routeJson as Route | undefined) ?? null;
}

/** Последняя сохранённая геометрия — с неё открывается конструктор */
export async function getLatestRoute(configurationId: string): Promise<Route | null> {
  const s = await requirePermission("configuration", "read");
  if (!(await ownedConfiguration(configurationId, s))) return null;

  const [row] = await db
    .select({ routeJson: configVersions.routeJson })
    .from(configVersions)
    .where(eq(configVersions.configurationId, configurationId))
    .orderBy(desc(configVersions.versionNo))
    .limit(1);

  return (row?.routeJson as Route | undefined) ?? null;
}
