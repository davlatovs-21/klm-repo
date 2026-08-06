import { test } from "node:test";
import assert from "node:assert/strict";
import { submitLead, setLeadSink, __resetLeadState, DEDUP_MS, type LeadInput, type LeadRecord } from "./leads";

const T0 = 1_770_000_000_000; // фиксированное время: расчёт не должен зависеть от часов

const lead = (over: Partial<LeadInput> = {}): LeadInput => ({
  name: "Иванов Пётр",
  contact: "p.ivanov@example.com",
  company: "ПроектСтрой",
  calcQuery: "p=1200&l=120",
  calcSummary: "KLM-S 1600 А Al IP54",
  utm: { utm_source: "yandex" },
  source: "calc",
  ...over,
});

const ctx = (over: Partial<{ ip: string; honeypot: string; consent: boolean; now: number }> = {}) => ({
  ip: "10.0.0.1", honeypot: "", consent: true, now: T0, ...over,
});

const collect = () => {
  const got: LeadRecord[] = [];
  setLeadSink(async (l) => void got.push(l));
  return got;
};

test("корректная заявка принимается и уходит в приёмник", async () => {
  __resetLeadState();
  const got = collect();
  assert.deepEqual(await submitLead(lead(), ctx()), { ok: true });
  assert.equal(got.length, 1);
  assert.equal(got[0].name, "Иванов Пётр");
  assert.equal(got[0].utm.utm_source, "yandex");
  assert.equal(got[0].receivedAt, new Date(T0).toISOString());
});

test("без согласия на обработку персональных данных заявка не принимается", async () => {
  __resetLeadState();
  const got = collect();
  const r = await submitLead(lead(), ctx({ consent: false }));
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.field, "consent");
  assert.equal(got.length, 0);
});

test("ловушка для ботов отсекает молча: боту отвечаем «принято», в приёмник ничего не идёт", async () => {
  __resetLeadState();
  const got = collect();
  assert.deepEqual(await submitLead(lead(), ctx({ honeypot: "http://spam" })), { ok: true });
  assert.equal(got.length, 0);
});

test("контакт проверяется: нужен телефон или почта", async () => {
  __resetLeadState();
  collect();
  for (const bad of ["", "иван", "12345", "@example.com", "нет контакта"]) {
    const r = await submitLead(lead({ contact: bad }), ctx());
    assert.equal(r.ok, false, `«${bad}» не должно проходить`);
    assert.equal(r.ok === false && r.field, "contact");
  }
  for (const good of ["p@example.com", "+7 999 123-45-67", "89991234567"]) {
    __resetLeadState();
    collect();
    assert.deepEqual(await submitLead(lead({ contact: good }), ctx()), { ok: true }, good);
  }
});

test("имя короче двух символов не проходит", async () => {
  __resetLeadState();
  collect();
  const r = await submitLead(lead({ name: " И " }), ctx());
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.field, "name");
});

test("повторная отправка той же формы в течение минуты отклоняется (критерий приёмки M1)", async () => {
  __resetLeadState();
  const got = collect();
  assert.deepEqual(await submitLead(lead(), ctx()), { ok: true });

  const again = await submitLead(lead(), ctx({ now: T0 + 30_000 }));
  assert.equal(again.ok, false);
  assert.match(again.ok === false ? again.error : "", /уже отправлена/);
  assert.equal(got.length, 1);

  // через минуту та же заявка принимается снова
  assert.deepEqual(await submitLead(lead(), ctx({ now: T0 + DEDUP_MS + 1 })), { ok: true });
  assert.equal(got.length, 2);
});

test("другой расчёт от того же человека — это новая заявка, а не повтор", async () => {
  __resetLeadState();
  const got = collect();
  await submitLead(lead(), ctx());
  assert.deepEqual(await submitLead(lead({ calcQuery: "p=2500&l=200" }), ctx({ now: T0 + 1000 })), { ok: true });
  assert.equal(got.length, 2);
});

test("ограничение частоты: не больше пяти заявок с адреса в минуту", async () => {
  __resetLeadState();
  const got = collect();
  for (let i = 0; i < 5; i++) {
    const r = await submitLead(lead({ contact: `user${i}@example.com` }), ctx({ now: T0 + i * 1000 }));
    assert.deepEqual(r, { ok: true }, `заявка ${i + 1}`);
  }
  const sixth = await submitLead(lead({ contact: "user9@example.com" }), ctx({ now: T0 + 6000 }));
  assert.equal(sixth.ok, false);
  assert.match(sixth.ok === false ? sixth.error : "", /Слишком много заявок/);
  assert.equal(got.length, 5);

  // окно сдвинулось — приём возобновляется
  assert.deepEqual(
    await submitLead(lead({ contact: "user9@example.com" }), ctx({ now: T0 + 61_000 })),
    { ok: true },
  );
});

test("ограничение частоты считается по адресу, а не на всех сразу", async () => {
  __resetLeadState();
  collect();
  for (let i = 0; i < 5; i++) await submitLead(lead({ contact: `a${i}@e.com` }), ctx({ ip: "10.0.0.1", now: T0 + i }));
  assert.deepEqual(
    await submitLead(lead({ contact: "b@e.com" }), ctx({ ip: "10.0.0.2", now: T0 + 10 })),
    { ok: true },
  );
});

test("заявка из виджета несёт источник и дилера", async () => {
  __resetLeadState();
  const got = collect();
  await submitLead(lead({ source: "widget", dealer: "dealer-17" }), ctx());
  assert.equal(got[0].source, "widget");
  assert.equal(got[0].dealer, "dealer-17");
});
