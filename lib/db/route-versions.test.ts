/**
 * Версии конфигурации трассы против настоящей базы.
 * Слой доступа требует сессии, поэтому здесь проверяется то, что от неё
 * не зависит: нумерация версий, снимок результата, изоляция по владению,
 * уникальность номера. Права проверяются тестами матрицы в lib/auth.
 *
 * Запуск: npm run test:db
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq, sql as raw } from "drizzle-orm";
import { db, sql } from "./client";
import { configurations, configVersions, organizations, projects, tenants } from "./schema";
import { analyzeRoute, type Route } from "../core/route";

const MARK = "версии-автотест";
let configId = "";
let otherConfigId = "";

const route = (lengthMm: number): Route => ({
  segments: [{ id: "s1", direction: "x+", lengthMm }],
  taps: [], crossings: [], feed: "start", material: "Al", branches: 0,
});

/** Вставка версии тем же способом, что и слой доступа, но без проверки сессии */
async function addVersion(configurationId: string, r: Route) {
  return db.transaction(async (tx) => {
    const [{ max }] = await tx
      .select({ max: raw<number>`coalesce(max(${configVersions.versionNo}), 0)` })
      .from(configVersions)
      .where(eq(configVersions.configurationId, configurationId));
    const [v] = await tx
      .insert(configVersions)
      .values({
        configurationId,
        versionNo: Number(max) + 1,
        routeJson: r,
        resultJson: analyzeRoute(r),
      })
      .returning();
    await tx.update(configurations).set({ currentVersionId: v.id }).where(eq(configurations.id, configurationId));
    return v;
  });
}

const cleanup = async () => {
  await sql`delete from config_versions where configuration_id in (
    select c.id from configurations c join projects p on p.id = c.project_id where p.name like ${MARK + "%"})`;
  await sql`update configurations set current_version_id = null where project_id in (select id from projects where name like ${MARK + "%"})`;
  await sql`delete from configurations where project_id in (select id from projects where name like ${MARK + "%"})`;
  await sql`delete from projects where name like ${MARK + "%"}`;
  await sql`delete from organizations where name like ${MARK + "%"}`;
};

before(async () => {
  await cleanup();
  const [t] = await db.select().from(tenants).limit(1);
  const [org] = await db.insert(organizations).values({ tenantId: t.id, name: `${MARK}-орг` }).returning();
  const [p1] = await db.insert(projects).values({ tenantId: t.id, organizationId: org.id, name: `${MARK}-проект` }).returning();
  const [p2] = await db.insert(projects).values({ tenantId: t.id, organizationId: org.id, name: `${MARK}-чужой` }).returning();
  const [c1] = await db.insert(configurations).values({ projectId: p1.id, name: "Трасса" }).returning();
  const [c2] = await db.insert(configurations).values({ projectId: p2.id, name: "Другая" }).returning();
  configId = c1.id;
  otherConfigId = c2.id;
});

after(async () => { await cleanup(); await sql.end(); });

test("номер версии растёт с единицы и не пропускает значений", async () => {
  for (const len of [10_000, 20_000, 30_000]) await addVersion(configId, route(len));
  const rows = await db.select().from(configVersions).where(eq(configVersions.configurationId, configId));
  assert.deepEqual(rows.map((v) => v.versionNo).sort((a, b) => a - b), [1, 2, 3]);
});

test("сохранение переставляет текущую версию конфигурации", async () => {
  const [cfg] = await db.select().from(configurations).where(eq(configurations.id, configId));
  const rows = await db.select().from(configVersions).where(eq(configVersions.configurationId, configId));
  const latest = rows.reduce((a, b) => (a.versionNo > b.versionNo ? a : b));
  assert.equal(cfg.currentVersionId, latest.id);
});

test("геометрия и снимок результата хранятся целиком", async () => {
  const rows = await db.select().from(configVersions).where(eq(configVersions.configurationId, configId));
  const v1 = rows.find((v) => v.versionNo === 1)!;
  const stored = v1.routeJson as Route;
  assert.equal(stored.segments[0].lengthMm, 10_000);
  assert.equal(stored.material, "Al");

  const snapshot = v1.resultJson as ReturnType<typeof analyzeRoute>;
  assert.equal(snapshot.totalLengthM, 10);
  assert.ok(snapshot.elements.length > 0, "перечень элементов сохранён вместе с версией");
  assert.ok(snapshot.checks.length > 0, "проверки тоже — версия должна открываться как была");
});

test("старая версия не переписывается новой", async () => {
  const rows = await db.select().from(configVersions).where(eq(configVersions.configurationId, configId));
  const lengths = rows
    .sort((a, b) => a.versionNo - b.versionNo)
    .map((v) => (v.routeJson as Route).segments[0].lengthMm);
  assert.deepEqual(lengths, [10_000, 20_000, 30_000]);
});

test("версии соседней конфигурации не смешиваются", async () => {
  await addVersion(otherConfigId, route(99_000));
  const mine = await db.select().from(configVersions).where(eq(configVersions.configurationId, configId));
  const theirs = await db.select().from(configVersions).where(eq(configVersions.configurationId, otherConfigId));
  assert.equal(mine.length, 3);
  assert.equal(theirs.length, 1);
  assert.equal(theirs[0].versionNo, 1, "нумерация своя у каждой конфигурации");
});

test("два одинаковых номера в одной конфигурации база не пропустит", async () => {
  // drizzle заворачивает ошибку базы, поэтому смотрим в первопричину:
  // код 23505 — нарушение уникальности
  await assert.rejects(
    () => db.insert(configVersions).values({ configurationId: configId, versionNo: 1, routeJson: route(1_000) }),
    (e: unknown) => {
      const cause = (e as { cause?: { code?: string; constraint_name?: string } }).cause;
      assert.equal(cause?.code, "23505", "уникальный индекс защищает от гонки при одновременном сохранении");
      assert.equal(cause?.constraint_name, "config_versions_no_idx");
      return true;
    },
  );
});

test("конфигурация может начинаться с одной геометрии, без электрического расчёта", async () => {
  const rows = await db.select().from(configVersions).where(eq(configVersions.configurationId, configId));
  assert.ok(rows.every((v) => v.inputJson === null), "input_json не обязателен");
});
