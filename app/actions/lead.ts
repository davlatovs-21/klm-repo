"use server";

import { headers } from "next/headers";
import { submitLead, type LeadResult } from "@/lib/leads";

/**
 * Приём заявки публичного калькулятора. Server Action, а не маршрут API:
 * выполняется только на сервере и даёт встроенную защиту от CSRF (ТЗ 12.3).
 */
export async function sendLead(_prev: LeadResult | null, form: FormData): Promise<LeadResult> {
  const h = await headers();
  // за обратным прокси реальный адрес приходит заголовком; вариант с ним согласуется на Этапе 1
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "0.0.0.0";

  const str = (k: string) => String(form.get(k) ?? "").slice(0, 500);

  const utm: Record<string, string> = {};
  for (const [k, v] of form.entries())
    if (k.startsWith("utm_") && typeof v === "string" && v) utm[k] = v.slice(0, 200);

  return submitLead(
    {
      name: str("name"),
      contact: str("contact"),
      company: str("company") || undefined,
      objectName: str("objectName") || undefined,
      comment: str("comment") || undefined,
      calcQuery: str("calcQuery"),
      calcSummary: str("calcSummary"),
      utm,
      dealer: str("dealer") || undefined,
      source: str("source") === "widget" ? "widget" : "calc",
    },
    {
      ip,
      honeypot: str("website"),
      consent: form.get("consent") === "on",
      now: Date.now(),
    },
  );
}
