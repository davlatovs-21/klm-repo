/**
 * Приём заявок публичного калькулятора — модуль M1, пункты 6–8 ТЗ.
 *
 * НЕ часть расчётного ядра: здесь состояние и побочные эффекты, ядро остаётся чистым.
 *
 * Чего здесь нет и почему:
 *   — записи в БД. Таблицы projects и calc_log появятся на Этапе 1. До тех пор заявка
 *     уходит в структурированный журнал stdout — ровно тот канал, который ТЗ 14.1 задаёт
 *     для технического журнала. Подмену на Postgres делает одна функция setLeadSink;
 *   — загрузки файла планировки. Нужно объектное хранилище с подписанными ссылками и
 *     антивирусом (ТЗ 12.4). Принимать файл и выбрасывать нельзя — это обман;
 *   — Vercel BotID. Площадка по 152-ФЗ будет российской, значит BotID недоступен.
 *     Остаются honeypot и ограничение частоты.
 */

export type LeadInput = {
  name: string;
  contact: string;
  company?: string;
  objectName?: string;
  comment?: string;
  /** Ссылка на расчёт: строка запроса из encodeInput */
  calcQuery: string;
  /** Краткий итог расчёта для менеджера, чтобы не пересчитывать вручную */
  calcSummary: string;
  /** Метки перехода, пункт M1.8 */
  utm: Record<string, string>;
  /** Идентификатор дилера из виджета, пункт M1.10 */
  dealer?: string;
  source: "calc" | "widget";
};

export type LeadRecord = LeadInput & { receivedAt: string; ip: string };

export type LeadSink = (lead: LeadRecord) => Promise<void>;

/** Журнал в stdout: одна строка JSON на заявку. Заменяется на репозиторий БД на Этапе 1. */
const stdoutSink: LeadSink = async (lead) => {
  console.log(JSON.stringify({ event: "lead.created", ...lead }));
};

let sink: LeadSink = stdoutSink;
export const setLeadSink = (next: LeadSink) => { sink = next; };

/* ── ограничение частоты и повторные отправки ─────────────────────────
   ponytail: счётчики в памяти процесса. Этого достаточно для одного экземпляра;
   при двух репликах за балансировщиком нужен Redis (ТЗ 19.1) — состояние переезжает
   в него без изменения вызывающего кода. */

const WINDOW_MS = 60_000;
/** Не больше пяти заявок с одного адреса в минуту */
const MAX_PER_WINDOW = 5;
/** Повторная отправка той же формы в течение минуты отклоняется — критерий приёмки M1 */
export const DEDUP_MS = 60_000;

const hits = new Map<string, number[]>();
const fingerprints = new Map<string, number>();

/** Отпечаток заявки: тот же человек с тем же расчётом. Пароли и секреты сюда не попадают. */
const fingerprintOf = (l: LeadInput, ip: string) =>
  [ip, l.contact.trim().toLowerCase(), l.calcQuery].join("|");

const sweep = (now: number) => {
  for (const [k, times] of hits) {
    const fresh = times.filter((t) => now - t < WINDOW_MS);
    if (fresh.length) hits.set(k, fresh);
    else hits.delete(k);
  }
  for (const [k, t] of fingerprints) if (now - t >= DEDUP_MS) fingerprints.delete(k);
};

export type LeadResult = { ok: true } | { ok: false; error: string; field?: keyof LeadInput | "consent" };

/**
 * Разбор формы заявки. Вынесен из Server Action, чтобы проверяться тестами:
 * в самом действии остаётся только получение адреса и вызов submitLead.
 */
export function parseLeadForm(form: {
  get(name: string): unknown;
  entries(): IterableIterator<[string, unknown]>;
}): { lead: LeadInput; honeypot: string; consent: boolean } {
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.slice(0, 500) : "";
  };

  const utm: Record<string, string> = {};
  for (const [k, v] of form.entries())
    if (k.startsWith("utm_") && typeof v === "string" && v) utm[k] = v.slice(0, 200);

  return {
    lead: {
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
    honeypot: str("website"),
    consent: form.get("consent") === "on",
  };
}

export type SubmitContext = {
  ip: string;
  /** Значение скрытого поля-ловушки: заполнено — значит бот */
  honeypot: string;
  consent: boolean;
  /** Текущее время, мс — передаётся снаружи, чтобы функция оставалась проверяемой */
  now: number;
};

const CONTACT_RE = /^(?:[^@\s]+@[^@\s.]+\.[^@\s]{2,}|\+?[\d\s()-]{10,20})$/;

export async function submitLead(input: LeadInput, ctx: SubmitContext): Promise<LeadResult> {
  // ловушка срабатывает молча: боту незачем знать, что его отсеяли
  if (ctx.honeypot.trim() !== "") return { ok: true };

  if (!ctx.consent)
    return { ok: false, error: "Без согласия на обработку персональных данных заявку принять нельзя", field: "consent" };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Укажите, как к вам обращаться", field: "name" };

  const contact = input.contact.trim();
  if (!CONTACT_RE.test(contact))
    return { ok: false, error: "Нужен телефон или адрес электронной почты", field: "contact" };

  sweep(ctx.now);

  const times = hits.get(ctx.ip) ?? [];
  if (times.length >= MAX_PER_WINDOW)
    return { ok: false, error: "Слишком много заявок подряд. Попробуйте через минуту" };

  const fp = fingerprintOf({ ...input, contact }, ctx.ip);
  if (fingerprints.has(fp))
    return { ok: false, error: "Эта заявка уже отправлена — менеджер её видит" };

  hits.set(ctx.ip, [...times, ctx.now]);
  fingerprints.set(fp, ctx.now);

  await sink({
    ...input,
    name,
    contact,
    receivedAt: new Date(ctx.now).toISOString(),
    ip: ctx.ip,
  });

  return { ok: true };
}

/** Для тестов: сброс счётчиков между сценариями */
export const __resetLeadState = () => { hits.clear(); fingerprints.clear(); sink = stdoutSink; };
