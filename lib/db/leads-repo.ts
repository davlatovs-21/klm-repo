/**
 * Приёмник заявок, пишущий в базу. Подставляется вместо журнала stdout,
 * которым Этап 6 обходился, пока таблиц не было.
 *
 * Заявка становится Проектом в статусе lead с источником, метками перехода
 * и дилером — это критерий приёмки модуля M1 ТЗ.
 */
import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { organizations, projects, tenants, calcLog } from "./schema";
import { INBOX_ORG } from "./seed";
import type { LeadRecord, LeadSink } from "../leads";

/** Организация «Входящие заявки» — куда падает лид, пока менеджер его не разобрал */
async function inboxOrg() {
  const [tenant] = await db.select().from(tenants).limit(1);
  if (!tenant) throw new Error("База не наполнена: запустите npm run db:seed");

  const [org] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.tenantId, tenant.id), eq(organizations.name, INBOX_ORG)))
    .limit(1);
  if (!org) throw new Error(`Организация «${INBOX_ORG}» не найдена: запустите npm run db:seed`);

  return { tenant, org };
}

export const dbLeadSink: LeadSink = async (lead: LeadRecord) => {
  const { tenant, org } = await inboxOrg();

  const [project] = await db
    .insert(projects)
    .values({
      tenantId: tenant.id,
      organizationId: org.id,
      name: lead.objectName?.trim() || `Заявка от ${lead.name}`,
      customerName: lead.company?.trim() || lead.name,
      contact: lead.contact,
      comment: lead.comment?.trim() || null,
      status: "lead",
      source: lead.source,
      utmJson: Object.keys(lead.utm).length > 0 ? lead.utm : null,
      dealerRef: lead.dealer ?? null,
      createdAt: new Date(lead.receivedAt),
    })
    .returning();

  /**
   * Расчёт из заявки — в расчётный журнал. Персональные данные сюда не попадают:
   * журнал обезличенный и хранится бессрочно (ТЗ 14.1).
   */
  await db.insert(calcLog).values({
    tenantId: tenant.id,
    inputJson: { query: lead.calcQuery },
    resultSummaryJson: { summary: lead.calcSummary, projectId: project.id },
    source: lead.source,
    utmJson: Object.keys(lead.utm).length > 0 ? lead.utm : null,
  });

  return;
};
