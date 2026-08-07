import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPasswordStrength, hashPassword, verifyPassword, ARGON_OPTIONS, PASSWORD_MIN_LENGTH } from "./password";
import { issueToken, verifySignature, hashToken } from "./token";
import { maskSecrets } from "../audit/mask";
import { can, DISCOUNT_LIMITS, MATRIX } from "../dal/permissions";

process.env.SESSION_SECRET ??= "тестовый-секрет-длиннее-тридцати-двух-символов";

/* ── пароли ─────────────────────────────────────────────────────── */

test("пароль хешируется argon2id с параметрами из ТЗ", async () => {
  const h = await hashPassword("достаточно-длинный-пароль");
  assert.ok(h.startsWith("$argon2id$"), "алгоритм argon2id");
  assert.match(h, new RegExp(`m=${ARGON_OPTIONS.memoryCost},t=${ARGON_OPTIONS.timeCost},p=${ARGON_OPTIONS.parallelism}`));
});

test("проверка пароля: верный проходит, неверный нет", async () => {
  const h = await hashPassword("достаточно-длинный-пароль");
  assert.equal(await verifyPassword(h, "достаточно-длинный-пароль"), true);
  assert.equal(await verifyPassword(h, "достаточно-длинный-паролЬ"), false);
});

test("одинаковые пароли дают разные хеши — соль своя у каждого", async () => {
  const [a, b] = await Promise.all([hashPassword("одинаковый-пароль-123"), hashPassword("одинаковый-пароль-123")]);
  assert.notEqual(a, b);
});

test("битый или пустой хеш не пускает внутрь и не роняет проверку", async () => {
  assert.equal(await verifyPassword(null, "любой"), false);
  assert.equal(await verifyPassword("", "любой"), false);
  assert.equal(await verifyPassword("не-хеш-вообще", "любой"), false);
  assert.equal(await verifyPassword("$argon2id$сломано", "любой"), false);
});

test("короткие и утёкшие пароли отклоняются", () => {
  assert.equal(checkPasswordStrength("к".repeat(PASSWORD_MIN_LENGTH - 1)).ok, false);
  assert.equal(checkPasswordStrength("к".repeat(PASSWORD_MIN_LENGTH)).ok, true);
  const weak = checkPasswordStrength("qwertyuiop");
  assert.equal(weak.ok, false);
  const leaked = checkPasswordStrength("PassWord");
  assert.equal(leaked.ok, false); // короче 12 символов
  assert.equal(checkPasswordStrength("qwerty123456").ok, false); // есть в списке утечек
});

/* ── сессионный токен ───────────────────────────────────────────── */

test("подпись куки сходится, хеш для базы совпадает с ожидаемым", () => {
  const { cookieValue, tokenHash } = issueToken();
  assert.equal(verifySignature(cookieValue), tokenHash);
  assert.equal(tokenHash, hashToken(cookieValue.split(".")[0]));
});

test("сам токен в базе не хранится — только его хеш", () => {
  const { cookieValue, tokenHash } = issueToken();
  const rawPart = cookieValue.split(".")[0];
  assert.notEqual(tokenHash, rawPart);
  assert.equal(tokenHash.length, 64); // sha256 в hex
});

test("подделанная кука отклоняется", () => {
  const { cookieValue } = issueToken();
  const [raw, sig] = cookieValue.split(".");
  assert.equal(verifySignature(undefined), null);
  assert.equal(verifySignature(""), null);
  assert.equal(verifySignature("без-точки"), null);
  assert.equal(verifySignature(`${raw}.`), null);
  assert.equal(verifySignature(`.${sig}`), null);
  assert.equal(verifySignature(`${raw}.${sig}x`), null, "испорченная подпись");
  assert.equal(verifySignature(`${issueToken().cookieValue.split(".")[0]}.${sig}`), null, "чужая подпись");
});

test("два токена подряд не совпадают", () => {
  const a = issueToken();
  const b = issueToken();
  assert.notEqual(a.cookieValue, b.cookieValue);
  assert.notEqual(a.tokenHash, b.tokenHash);
});

/* ── маскирование в журнале ─────────────────────────────────────── */

test("секреты не попадают в журнал аудита", () => {
  const masked = maskSecrets({
    email: "p@example.com",
    password: "секрет",
    passwordHash: "$argon2id$...",
    token: "abc",
    totpSecret: "JBSWY3DP",
    nested: { cookie: "session=1", ok: "видно" },
    list: [{ secret: "прячем" }],
  }) as Record<string, unknown>;

  const flat = JSON.stringify(masked);
  for (const leak of ["секрет", "$argon2id$", "abc", "JBSWY3DP", "session=1", "прячем"])
    assert.ok(!flat.includes(leak), `утекло: ${leak}`);
  assert.equal(masked.email, "p@example.com", "непохожие на секреты поля остаются");
  assert.equal((masked.nested as Record<string, unknown>).ok, "видно");
});

/* ── матрица прав ───────────────────────────────────────────────── */

test("себестоимость не видна клиенту и дилеру, видна внутренним ролям", () => {
  for (const role of ["client", "dealer"] as const) assert.equal(can(role, "cost", "read"), false, role);
  for (const role of ["sales", "engineer", "head", "admin", "auditor"] as const)
    assert.equal(can(role, "cost", "read"), true, role);
});

test("ручная правка спецификации — только инженер и администратор", () => {
  assert.equal(can("engineer", "bom", "update"), true);
  assert.equal(can("admin", "bom", "update"), true);
  for (const role of ["sales", "head", "client", "dealer", "production"] as const)
    assert.equal(can(role, "bom", "update"), false, role);
});

test("прайс правит только администратор, правила расчёта — инженер и администратор", () => {
  assert.equal(can("admin", "pricelist", "update"), true);
  assert.equal(can("head", "pricelist", "update"), false);
  assert.equal(can("engineer", "rules", "update"), true);
  assert.equal(can("sales", "rules", "update"), false);
});

test("owner имеет права администратора плюс настройки тенанта", () => {
  assert.equal(can("owner", "pricelist", "update"), true);
  assert.equal(can("owner", "tenant", "update"), true);
  assert.equal(can("admin", "tenant", "update"), true);
  assert.equal(can("head", "tenant", "update"), false);
});

test("имперсонация и журнал аудита закрыты для всех, кроме указанных ролей", () => {
  assert.equal(can("admin", "impersonate", "create"), true);
  for (const role of ["head", "sales", "engineer", "auditor", "client"] as const)
    assert.equal(can(role, "impersonate", "create"), false, role);
  assert.equal(can("auditor", "audit", "read"), true);
  assert.equal(can("sales", "audit", "read"), false);
});

test("неизвестное право закрыто по умолчанию, а не открыто", () => {
  assert.equal(can("admin", "project", "publish"), false);
  assert.equal(can("admin", "cost", "delete"), false);
});

test("аудитор нигде не может менять данные", () => {
  const actions = ["create", "update", "delete", "publish"] as const;
  for (const resource of Object.keys(MATRIX) as (keyof typeof MATRIX)[])
    for (const a of actions)
      assert.equal(can("auditor", resource, a), false, `auditor ${resource}:${a}`);
});

test("лимиты скидок соответствуют разделу 11.3", () => {
  assert.equal(DISCOUNT_LIMITS.sales, 7);
  assert.equal(DISCOUNT_LIMITS.head, 20);
  assert.equal(DISCOUNT_LIMITS.engineer, 0);
  assert.equal(DISCOUNT_LIMITS.admin, null);
});
