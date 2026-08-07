import "server-only";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { maskSecrets, type AuditEntry } from "./mask";

export { maskSecrets } from "./mask";
export type { AuditAction, AuditEntry } from "./mask";

/**
 * Запись в журнал аудита — раздел 14 ТЗ. Только на добавление: права UPDATE
 * и DELETE отозваны у роли приложения миграцией drizzle/0001_rls_and_append_only.sql,
 * так что переписать историю нельзя даже при ошибке в коде.
 */
export async function writeAudit(entry: AuditEntry) {
  await db.insert(auditLog).values({
    tenantId: entry.tenantId ?? null,
    actorId: entry.actorId ?? null,
    actorIp: entry.actorIp ?? null,
    actorUa: entry.actorUa?.slice(0, 500) ?? null,
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    beforeJson: entry.before === undefined ? null : (maskSecrets(entry.before) as object),
    afterJson: entry.after === undefined ? null : (maskSecrets(entry.after) as object),
    requestId: entry.requestId ?? null,
  });
}
