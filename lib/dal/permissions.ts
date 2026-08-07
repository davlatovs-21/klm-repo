import type { Role } from "@/lib/db/schema";

/**
 * Матрица прав — раздел 11.2 ТЗ. Право = пара «ресурс : действие».
 *
 * Таблица чистая, без обращений к базе и запросному контексту: её можно
 * проверять тестами построчно и позже перенести в справочник, не трогая вызовы.
 * Роль guest здесь не значится — это отсутствие членства, а не роль в базе.
 *
 * Обозначения ТЗ: ✓ полный доступ, ○ только своё или своей организации.
 * В коде оба означают «право есть»; сужение до своей организации делает
 * слой доступа фильтром по organization_id, а не эта таблица.
 */

export type Resource =
  | "project" | "configuration" | "bom" | "cost" | "price" | "quote"
  | "discount" | "order" | "production" | "catalog" | "pricelist"
  | "rules" | "users" | "analytics" | "audit" | "impersonate" | "tenant";

export type Action = "create" | "read" | "update" | "delete" | "publish";

type Matrix = Partial<Record<Resource, Partial<Record<Action, Role[]>>>>;

const ALL_INTERNAL: Role[] = ["sales", "engineer", "head", "admin"];

export const MATRIX: Matrix = {
  project: {
    create: ["client", "dealer", ...ALL_INTERNAL],
    read: ["client", "dealer", ...ALL_INTERNAL, "production", "auditor"],
    update: ["client", "dealer", ...ALL_INTERNAL],
    delete: ["head", "admin"],
  },
  configuration: {
    read: ["client", "dealer", ...ALL_INTERNAL, "auditor"],
    update: ["client", "dealer", ...ALL_INTERNAL],
  },
  // ручная правка спецификации — только инженер и администратор
  bom: { update: ["engineer", "admin"] },
  // себестоимость и маржа: клиенту и дилеру не видны никогда
  cost: { read: ["sales", "engineer", "head", "production", "admin", "auditor"] },
  price: { read: ["client", "dealer", ...ALL_INTERNAL, "auditor"] },
  quote: { create: ["dealer", ...ALL_INTERNAL] },
  discount: { publish: ["head", "admin"] },
  order: { update: ["sales", "head", "admin"] },
  production: { read: ["sales", "engineer", "head", "production", "admin", "auditor"] },
  catalog: {
    read: [...ALL_INTERNAL, "production", "auditor"],
    update: ["engineer", "admin"],
  },
  pricelist: { update: ["admin"] },
  rules: { update: ["engineer", "admin"] },
  users: { update: ["dealer", "head", "admin"] },
  analytics: { read: ["client", "dealer", ...ALL_INTERNAL, "production", "auditor"] },
  audit: { read: ["head", "admin", "auditor"] },
  impersonate: { create: ["admin"] },
  tenant: { update: ["admin", "owner"] },
};

/** owner = admin плюс биллинг и брендирование тенанта (ТЗ 11.2) */
const effectiveRoles = (role: Role): Role[] => (role === "owner" ? ["owner", "admin"] : [role]);

export function can(role: Role, resource: Resource, action: Action): boolean {
  const allowed = MATRIX[resource]?.[action];
  if (!allowed) return false;
  return effectiveRoles(role).some((r) => allowed.includes(r));
}

/** Лимиты скидки без согласования, раздел 11.3. Значения переедут в админку. */
export const DISCOUNT_LIMITS: Record<Role, number | null> = {
  client: 0,
  dealer: 0, // в пределах своего дилерского профиля — считается отдельно
  sales: 7,
  engineer: 0,
  head: 20,
  production: 0,
  admin: null, // без лимита, но с обязательным комментарием
  owner: null,
  auditor: 0,
};
