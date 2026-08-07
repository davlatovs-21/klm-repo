import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";

/**
 * Значение сессионной куки — подписанный идентификатор (ТЗ 12.2.1).
 *
 * Формат: <случайные 32 байта>.<HMAC-SHA256 от них>
 *
 * Зачем подпись, если тело сессии всё равно в базе: Proxy делает оптимистичную
 * проверку без обращения к базе (так требует документация Next — Proxy выполняется
 * на каждом маршруте, включая предзагружаемые). Подпись позволяет отсеять мусорную
 * куку прямо там, не тратя запрос к базе.
 *
 * В базе хранится SHA-256 от случайной части: утечка дампа не даёт войти,
 * а сессию можно отозвать, пометив запись.
 */

const b64url = (b: Buffer) => b.toString("base64url");

function secret(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32)
    throw new Error("SESSION_SECRET не задан или короче 32 символов — сгенерируйте: openssl rand -base64 32");
  return Buffer.from(s, "utf8");
}

const sign = (raw: Buffer) => b64url(createHmac("sha256", secret()).update(raw).digest());

/** Хеш для хранения в базе: сам токен нигде не сохраняется */
export const hashToken = (rawPart: string) => createHash("sha256").update(rawPart).digest("hex");

export type IssuedToken = { cookieValue: string; tokenHash: string };

export function issueToken(): IssuedToken {
  const raw = randomBytes(32);
  const rawPart = b64url(raw);
  return { cookieValue: `${rawPart}.${sign(raw)}`, tokenHash: hashToken(rawPart) };
}

/**
 * Проверка подписи без обращения к базе. Возвращает хеш токена для последующего
 * поиска сессии либо null, если кука мусорная или подпись не сходится.
 */
export function verifySignature(cookieValue: string | undefined | null): string | null {
  if (!cookieValue) return null;
  const dot = cookieValue.indexOf(".");
  if (dot <= 0) return null;

  const rawPart = cookieValue.slice(0, dot);
  const given = cookieValue.slice(dot + 1);

  let raw: Buffer;
  try {
    raw = Buffer.from(rawPart, "base64url");
  } catch {
    return null;
  }
  if (raw.length !== 32) return null;

  const expected = Buffer.from(sign(raw), "utf8");
  const actual = Buffer.from(given, "utf8");
  // сравнение постоянного времени: длину сверяем отдельно, иначе timingSafeEqual бросит
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return hashToken(rawPart);
}
