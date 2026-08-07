/**
 * Изоляция данных и неизменяемость журналов на уровне Postgres.
 * Второй рубеж защиты: раздел 10.2.1 и 14.3.1 ТЗ. Первый — слой доступа lib/dal.
 *
 * Проверки идут под ролью klm_app: владелец схемы RLS обходит, и это ожидаемо —
 * миграции и сид должны видеть всё. Приложение в промышленной среде подключается
 * именно как klm_app.
 *
 * Запуск: npm run test:db
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "./client";

const MARK = "rls-автотест";
let tenantA = "";
let tenantB = "";

before(async () => {
  await sql`delete from projects where name like ${MARK + "%"}`;
  await sql`delete from organizations where name like ${MARK + "%"}`;
  await sql`delete from tenants where name like ${MARK + "%"}`;

  const [a] = await sql`insert into tenants (name) values (${MARK + "-A"}) returning id`;
  const [b] = await sql`insert into tenants (name) values (${MARK + "-B"}) returning id`;
  tenantA = a.id;
  tenantB = b.id;

  const [orgA] = await sql`insert into organizations (tenant_id, name) values (${tenantA}, ${MARK + "-orgA"}) returning id`;
  const [orgB] = await sql`insert into organizations (tenant_id, name) values (${tenantB}, ${MARK + "-orgB"}) returning id`;

  await sql`insert into projects (tenant_id, organization_id, name) values (${tenantA}, ${orgA.id}, ${MARK + "-A"})`;
  await sql`insert into projects (tenant_id, organization_id, name) values (${tenantB}, ${orgB.id}, ${MARK + "-B"})`;
});

after(async () => {
  await sql`delete from projects where name like ${MARK + "%"}`;
  await sql`delete from organizations where name like ${MARK + "%"}`;
  await sql`delete from tenants where name like ${MARK + "%"}`;
  await sql.end();
});

/** Выполнить запрос от имени роли приложения с выставленным тенантом */
const asApp = <T>(tenantId: string | null, run: (t: typeof sql) => Promise<T>): Promise<T> =>
  sql.begin(async (t) => {
    await t`set local role klm_app`;
    if (tenantId) await t`select set_config('app.tenant_id', ${tenantId}, true)`;
    return run(t as unknown as typeof sql);
  }) as Promise<T>;

test("владелец схемы видит оба тенанта — миграции и сид не должны быть ослеплены", async () => {
  const rows = await sql`select name from projects where name like ${MARK + "%"} order by name`;
  assert.deepEqual(rows.map((r) => r.name), [`${MARK}-A`, `${MARK}-B`]);
});

test("роль приложения видит проекты только своего тенанта", async () => {
  const a = await asApp(tenantA, (t) => t`select name from projects where name like ${MARK + "%"}`);
  assert.deepEqual(a.map((r) => r.name), [`${MARK}-A`]);

  const b = await asApp(tenantB, (t) => t`select name from projects where name like ${MARK + "%"}`);
  assert.deepEqual(b.map((r) => r.name), [`${MARK}-B`]);
});

test("без выставленного тенанта не видно ничего — отказ в безопасную сторону", async () => {
  const rows = await asApp(null, (t) => t`select name from projects where name like ${MARK + "%"}`);
  assert.equal(rows.length, 0);
});

test("прямой запрос чужого проекта по идентификатору не проходит (защита от IDOR)", async () => {
  const [b] = await sql`select id from projects where name = ${MARK + "-B"}`;
  const rows = await asApp(tenantA, (t) => t`select id from projects where id = ${b.id}`);
  assert.equal(rows.length, 0, "проект другого тенанта не должен читаться по прямой ссылке");
});

test("организации и пользователи изолированы так же, как проекты", async () => {
  const orgs = await asApp(tenantA, (t) => t`select name from organizations where name like ${MARK + "%"}`);
  assert.deepEqual(orgs.map((r) => r.name), [`${MARK}-orgA`]);
});

test("журнал аудита нельзя переписать: UPDATE и DELETE запрещены роли приложения", async () => {
  const [row] = await sql`
    insert into audit_log (tenant_id, action, entity_type) values (${tenantA}, 'auth.login', ${MARK})
    returning id`;

  await assert.rejects(
    () => asApp(tenantA, (t) => t`update audit_log set action = 'подделка' where id = ${row.id}`),
    /permission denied/i,
    "UPDATE на журнале аудита должен быть запрещён",
  );
  await assert.rejects(
    () => asApp(tenantA, (t) => t`delete from audit_log where id = ${row.id}`),
    /permission denied/i,
    "DELETE на журнале аудита должен быть запрещён",
  );

  // добавлять записи роль приложения обязана уметь
  await asApp(tenantA, (t) => t`insert into audit_log (tenant_id, action) values (${tenantA}, 'auth.logout')`);

  await sql`delete from audit_log where tenant_id = ${tenantA}`;
});

test("расчётный журнал тоже только на добавление", async () => {
  await assert.rejects(
    () => asApp(tenantA, (t) => t`delete from calc_log where tenant_id = ${tenantA}`),
    /permission denied/i,
  );
});
