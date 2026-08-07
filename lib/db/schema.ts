/**
 * Схема базы — раздел 10 ТЗ.
 *
 * Заведены таблицы, которые нужны фундаменту (Этап 1) и уже работающему публичному
 * калькулятору (Этап 6). Справочники, прайсы, КП и заказы появятся вместе со своими
 * этапами: заводить их сейчас — писать мёртвую схему, а миграции всё равно только вперёд.
 *
 * Правила раздела 10.2, которые здесь соблюдаются:
 *   — tenant_id в каждой бизнес-таблице; фильтрация обязательна в слое доступа,
 *     RLS в Postgres добавляется вторым рубежом;
 *   — мягкое удаление archived_at везде, кроме журналов — они только на добавление;
 *   — деньги целыми копейками в bigint, не в float;
 *   — снимок расчёта хранится целиком, чтобы конфигурация годичной давности
 *     открывалась после смены справочника;
 *   — время в UTC (timestamptz), отображение — в поясе пользователя.
 */
import {
  bigint, boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

/* ── перечисления ─────────────────────────────────────────────────── */

/** Роли раздела 11.1. guest не хранится: это отсутствие членства */
export const roleEnum = pgEnum("role", [
  "client", "dealer", "sales", "engineer", "head", "production", "admin", "owner", "auditor",
]);

export const orgTypeEnum = pgEnum("org_type", ["client", "dealer", "internal"]);

/** Статусы проекта, раздел M7.1 */
export const projectStatusEnum = pgEnum("project_status", [
  "lead", "qualified", "calculating", "quoted", "negotiation",
  "won", "lost", "in_production", "shipped", "closed",
]);

/** Задача трассы — совпадает с Duty расчётного ядра */
export const dutyEnum = pgEnum("duty", ["main", "distribution", "mobile", "mv"]);

/** Откуда пришли исходные данные */
export const sourceEnum = pgEnum("source", ["calc", "widget", "manual", "api"]);

/* ── тенант и организации ─────────────────────────────────────────── */

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  domain: text("domain"),
  brandingJson: jsonb("branding_json"),
  locale: text("locale").notNull().default("ru"),
  currency: text("currency").notNull().default("RUB"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    inn: text("inn"),
    kpp: text("kpp"),
    type: orgTypeEnum("type").notNull().default("client"),
    address: text("address"),
    /** Ответственный менеджер КЛМ */
    managerId: uuid("manager_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("organizations_tenant_idx").on(t.tenantId),
    index("organizations_name_idx").on(t.name),
  ],
);

/* ── пользователи, членство, сессии ───────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    /** argon2id; null — вход только по одноразовой ссылке */
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    phone: text("phone"),
    position: text("position"),
    avatarUrl: text("avatar_url"),
    locale: text("locale").notNull().default("ru"),
    theme: text("theme").notNull().default("system"),
    timezone: text("timezone").notNull().default("Europe/Moscow"),
    isActive: boolean("is_active").notNull().default(true),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /** Блокировка после пяти неудачных попыток — раздел 12.1.5 */
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    totpSecret: text("totp_secret"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    // почта уникальна внутри тенанта, а не глобально: у white-label свои пользователи
    uniqueIndex("users_tenant_email_idx").on(t.tenantId, t.email),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    invitedBy: uuid("invited_by").references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("memberships_user_org_idx").on(t.userId, t.organizationId),
    index("memberships_org_idx").on(t.organizationId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** В куки уходит идентификатор, в базе лежит хеш токена — сессию можно отозвать */
    tokenHash: text("token_hash").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_idx").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    /** Ссылка живёт 72 часа и одноразовая — раздел M10.1 */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invites_token_idx").on(t.tokenHash)],
);

/* ── проекты и конфигурации ───────────────────────────────────────── */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    objectType: text("object_type"),
    address: text("address"),
    customerName: text("customer_name"),
    /** Контакты из заявки публичного калькулятора, пока лид не превратился в организацию */
    contact: text("contact"),
    comment: text("comment"),
    managerId: uuid("manager_id").references(() => users.id),
    status: projectStatusEnum("status").notNull().default("lead"),
    deadline: timestamp("deadline", { withTimezone: true }),
    /** Копейки, не рубли и не float — раздел 10.2.3 */
    budgetKopecks: bigint("budget_kopecks", { mode: "bigint" }),
    tags: text("tags").array(),
    source: sourceEnum("source").notNull().default("manual"),
    utmJson: jsonb("utm_json"),
    /** Идентификатор дилера из виджета — заявка падает на конкретного дилера */
    dealerRef: text("dealer_ref"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("projects_tenant_org_idx").on(t.tenantId, t.organizationId),
    index("projects_status_idx").on(t.status),
    index("projects_created_idx").on(t.createdAt),
    index("projects_name_idx").on(t.name),
  ],
);

export const configurations = pgTable(
  "configurations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    duty: dutyEnum("duty").notNull().default("main"),
    currentVersionId: uuid("current_version_id"),
    createdBy: uuid("created_by").references(() => users.id),
    /** Кто редактирует прямо сейчас — раздел M3.9 */
    lockedBy: uuid("locked_by").references(() => users.id),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [index("configurations_project_idx").on(t.projectId)],
);

export const configVersions = pgTable(
  "config_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    configurationId: uuid("configuration_id").notNull().references(() => configurations.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    /** Исходные данные расчёта — Input расчётного ядра */
    inputJson: jsonb("input_json").notNull(),
    /** Снимок результата целиком: старая конфигурация должна открываться как была */
    resultJson: jsonb("result_json"),
    routeJson: jsonb("route_json"),
    bomJson: jsonb("bom_json"),
    priceJson: jsonb("price_json"),
    comment: text("comment"),
    authorId: uuid("author_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("config_versions_no_idx").on(t.configurationId, t.versionNo)],
);

/* ── журналы: только на добавление ────────────────────────────────── */

/**
 * Аудит бизнес-действий, раздел 14. Хранение 3 года.
 * Права UPDATE и DELETE у роли приложения отзываются отдельной миграцией
 * при развёртывании — на уровне схемы это не выражается.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    actorId: uuid("actor_id").references(() => users.id),
    actorIp: text("actor_ip"),
    actorUa: text("actor_ua"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    /** Сквозной идентификатор запроса для сшивки с техническим журналом */
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
);

/**
 * Расчётный журнал, раздел 14.1. Пишется на каждый расчёт, включая анонимный
 * из публичного калькулятора: это данные о спросе (M12).
 * Хранится бессрочно и обезличенно — персональных данных здесь быть не должно.
 */
export const calcLog = pgTable(
  "calc_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    userId: uuid("user_id").references(() => users.id),
    inputJson: jsonb("input_json").notNull(),
    resultSummaryJson: jsonb("result_summary_json"),
    source: sourceEnum("source").notNull().default("calc"),
    utmJson: jsonb("utm_json"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calc_log_created_idx").on(t.createdAt)],
);

export type Tenant = typeof tenants.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Configuration = typeof configurations.$inferSelect;
export type ConfigVersion = typeof configVersions.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
