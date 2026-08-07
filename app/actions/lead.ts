"use server";

import { headers } from "next/headers";
import { parseLeadForm, submitLead, setLeadSink, type LeadResult } from "@/lib/leads";
import { dbLeadSink } from "@/lib/db/leads-repo";

// заявка становится Проектом в статусе lead — критерий приёмки M1
setLeadSink(dbLeadSink);

/**
 * Приём заявки публичного калькулятора. Server Action, а не маршрут API:
 * выполняется только на сервере и даёт встроенную защиту от CSRF (ТЗ 12.3).
 * Разбор и проверки — в lib/leads.ts, здесь только запросный контекст.
 */
export async function sendLead(_prev: LeadResult | null, form: FormData): Promise<LeadResult> {
  const h = await headers();
  // за обратным прокси реальный адрес приходит заголовком; вариант согласуется при развёртывании
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "0.0.0.0";

  const { lead, honeypot, consent } = parseLeadForm(form);
  return submitLead(lead, { ip, honeypot, consent, now: Date.now() });
}
