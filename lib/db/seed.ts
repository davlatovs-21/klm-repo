/**
 * Наполнение базы стартовыми данными. Запуск: npm run db:seed
 *
 * Сид идемпотентен: повторный запуск ничего не дублирует и не затирает.
 * Пароля администратору здесь не ставится — вход появится вместе с
 * аутентификацией (Этап 1, второй кусок), сейчас заводится только учётная запись.
 */
import { eq } from "drizzle-orm";
import { db } from "./client";
import { organizations, tenants, users } from "./schema";
import { COMPANY } from "../core/klm-catalog";

/** Организация, на которую падают заявки публичного калькулятора, пока лид не разобран */
export const INBOX_ORG = "Входящие заявки";

export async function seed() {
  const [tenant] =
    (await db.select().from(tenants).where(eq(tenants.name, COMPANY.name)).limit(1)).length > 0
      ? await db.select().from(tenants).where(eq(tenants.name, COMPANY.name)).limit(1)
      : await db.insert(tenants).values({ name: COMPANY.name, domain: "xn--b1aekkfgciabim3h.xn--p1ai" }).returning();

  const existingOrgs = await db.select().from(organizations).where(eq(organizations.tenantId, tenant.id));

  const ensureOrg = async (name: string, type: "internal" | "client") => {
    const found = existingOrgs.find((o) => o.name === name);
    if (found) return found;
    const [created] = await db.insert(organizations).values({ tenantId: tenant.id, name, type }).returning();
    return created;
  };

  const internal = await ensureOrg(COMPANY.name, "internal");
  const inbox = await ensureOrg(INBOX_ORG, "internal");

  const adminEmail = COMPANY.email;
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  const admin =
    existingAdmin[0] ??
    (
      await db
        .insert(users)
        .values({ tenantId: tenant.id, email: adminEmail, name: "Администратор КЛМ", position: "Администратор системы" })
        .returning()
    )[0];

  return { tenant, internal, inbox, admin };
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then((r) => {
      console.log("Тенант:       ", r.tenant.name, r.tenant.id);
      console.log("Организация:  ", r.internal.name);
      console.log("Входящие:     ", r.inbox.name, r.inbox.id);
      console.log("Администратор:", r.admin.email, "(пароль будет задан вместе с входом)");
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
