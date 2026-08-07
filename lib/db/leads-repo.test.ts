/**
 * Тесты против настоящей базы. Запуск: npm run test:db
 * Требуют применённых миграций и наполненной базы (npm run db:migrate && npm run db:seed).
 * За собой прибирают: созданные проекты и записи журнала удаляются.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { and, eq, sql as raw } from "drizzle-orm";
import { db, sql } from "./client";
import { calcLog, organizations, projects, tenants } from "./schema";
import { seed, INBOX_ORG } from "./seed";
import { dbLeadSink } from "./leads-repo";
import { submitLead, setLeadSink, __resetLeadState, type LeadInput } from "../leads";

const T0 = 1_770_000_000_000;
const MARK = "автотест-заявка";

const lead = (over: Partial<LeadInput> = {}): LeadInput => ({
  name: "Иванов Пётр",
  contact: "p.ivanov@example.com",
  company: "ПроектСтрой",
  objectName: MARK,
  comment: "проверка приёмника",
  calcQuery: "p=1200&l=120",
  calcSummary: "KLM-S 1600 А Al IP54",
  utm: { utm_source: "yandex", utm_campaign: "test" },
  source: "calc",
  ...over,
});

const ctx = { ip: "10.0.0.1", honeypot: "", consent: true, now: T0 };

const cleanup = async () => {
  const made = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, MARK));
  for (const p of made) {
    await db.delete(calcLog).where(raw`${calcLog.resultSummaryJson}->>'projectId' = ${p.id}`);
    await db.delete(projects).where(eq(projects.id, p.id));
  }
};

before(async () => {
  await seed();
  await cleanup();
});

after(async () => {
  await cleanup();
  await sql.end();
});

test("сид идемпотентен: повторный запуск не плодит тенантов и организаций", async () => {
  const before1 = await db.select().from(tenants);
  const orgsBefore = await db.select().from(organizations);
  await seed();
  assert.equal((await db.select().from(tenants)).length, before1.length);
  assert.equal((await db.select().from(organizations)).length, orgsBefore.length);
});

test("заявка становится Проектом в статусе lead с источником и метками (критерий приёмки M1)", async () => {
  __resetLeadState();
  setLeadSink(dbLeadSink);

  const r = await submitLead(lead(), ctx);
  assert.deepEqual(r, { ok: true });

  const [p] = await db.select().from(projects).where(eq(projects.name, MARK));
  assert.ok(p, "проект создан");
  assert.equal(p.status, "lead");
  assert.equal(p.source, "calc");
  assert.equal(p.customerName, "ПроектСтрой");
  assert.equal(p.contact, "p.ivanov@example.com");
  assert.deepEqual(p.utmJson, { utm_source: "yandex", utm_campaign: "test" });
  assert.equal(p.createdAt.toISOString(), new Date(T0).toISOString());
});

test("лид падает в организацию «Входящие заявки» своего тенанта", async () => {
  const [p] = await db.select().from(projects).where(eq(projects.name, MARK));
  const [org] = await db.select().from(organizations).where(eq(organizations.id, p.organizationId));
  assert.equal(org.name, INBOX_ORG);
  assert.equal(org.tenantId, p.tenantId);
});

test("расчёт из заявки уходит в расчётный журнал без персональных данных", async () => {
  const [p] = await db.select().from(projects).where(eq(projects.name, MARK));
  const rows = await db
    .select()
    .from(calcLog)
    .where(raw`${calcLog.resultSummaryJson}->>'projectId' = ${p.id}`);

  assert.equal(rows.length, 1);
  const serialized = JSON.stringify(rows[0]);
  for (const personal of ["Иванов", "p.ivanov@example.com", "ПроектСтрой"])
    assert.ok(!serialized.includes(personal), `в расчётном журнале не должно быть «${personal}»`);
  assert.equal(rows[0].source, "calc");
});

test("заявка из виджета сохраняет дилера", async () => {
  __resetLeadState();
  setLeadSink(dbLeadSink);
  await submitLead(lead({ source: "widget", dealer: "dealer-17", contact: "d@example.com" }), ctx);

  const [p] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.name, MARK), eq(projects.source, "widget")));
  assert.equal(p.dealerRef, "dealer-17");
});

test("деньги хранятся целыми копейками, а не дробью", async () => {
  const [p] = await db.select().from(projects).where(eq(projects.name, MARK));
  await db.update(projects).set({ budgetKopecks: BigInt(12345678) }).where(eq(projects.id, p.id));
  const [updated] = await db.select().from(projects).where(eq(projects.id, p.id));
  assert.equal(typeof updated.budgetKopecks, "bigint");
  assert.equal(updated.budgetKopecks, BigInt(12345678));
});
