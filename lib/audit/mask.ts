/**
 * Типы журнала аудита и маскирование секретов — раздел 14 ТЗ.
 *
 * Чистый модуль без базы и запросного контекста: маскированию неоткуда знать
 * про Postgres, а тестам не нужно поднимать соединение, чтобы проверить,
 * что пароль не утёк в журнал.
 */

/** Действия, которые обязаны попадать в журнал (ТЗ 14.2) */
export type AuditAction =
  | "auth.login" | "auth.login_failed" | "auth.logout" | "auth.register"
  | "auth.password_changed" | "auth.locked"
  | "project.created" | "project.updated" | "project.archived"
  | "config.updated" | "bom.manual_edit"
  | "quote.issued" | "discount.requested" | "discount.decided"
  | "order.confirmed" | "catalog.updated" | "pricelist.published"
  | "rules.updated" | "role.changed" | "user.invited" | "user.blocked"
  | "data.exported" | "document.downloaded" | "api.accessed"
  | "impersonate.start" | "impersonate.end" | "tenant.settings_changed";

export type AuditEntry = {
  action: AuditAction;
  tenantId?: string | null;
  actorId?: string | null;
  actorIp?: string | null;
  actorUa?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  requestId?: string | null;
};

/**
 * Поля, которые нельзя писать в журнал ни при каких условиях (ТЗ 14.3.2).
 * Маскирование на уровне сериализатора, а не на совести вызывающего.
 */
const SECRET_KEYS = /^(password|passwordHash|password_hash|token|tokenHash|token_hash|secret|totpSecret|totp_secret|authorization|cookie|cardNumber|pan)$/i;

export function maskSecrets(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(maskSecrets);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>))
    out[k] = SECRET_KEYS.test(k) ? "***" : maskSecrets(v);
  return out;
}
