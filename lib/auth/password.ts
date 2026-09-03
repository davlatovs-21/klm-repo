/**
 * Пароли — раздел 12.1 ТЗ.
 *
 * PBKDF2-SHA-256 реализован через стандартный Web Crypto API. В отличие от
 * нативного @node-rs/argon2, этот код одинаково работает в Node.js и Cloudflare
 * Workers и не добавляет в Worker bundle бинарные файлы `.node`.
 *
 * Формат хеша версионирован, чтобы параметры можно было безопасно повысить или
 * заменить алгоритм без изменения схемы базы данных.
 */
export const PBKDF2_OPTIONS = {
  iterations: 210_000,
  hash: "SHA-256",
  saltBytes: 16,
  keyBytes: 32,
} as const;

const HASH_PREFIX = "$pbkdf2-sha256$";
const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
};

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  // Копия гарантирует обычный ArrayBuffer: DOM-типы Web Crypto не принимают
  // потенциальный SharedArrayBuffer из обобщённого Uint8Array<ArrayBufferLike>.
  const saltBuffer = new Uint8Array(salt).buffer;
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: PBKDF2_OPTIONS.hash, salt: saltBuffer, iterations },
    key,
    PBKDF2_OPTIONS.keyBytes * 8,
  );
  return new Uint8Array(bits);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

/** Минимальная длина пароля по ТЗ 12.1.1 */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Список заведомо скомпрометированных паролей. ТЗ 12.1.1 требует проверки по HIBP
 * через k-anonymity либо офлайн-словаря в закрытом контуре.
 * ponytail: пока короткий встроенный список самых частых. Полноценная проверка
 * подключается вместе с решением по площадке — в закрытом контуре обращаться
 * к внешнему сервису нельзя, там нужен локальный словарь.
 */
const COMMON = new Set([
  "password", "passw0rd", "qwertyuiop", "123456789012", "qwerty123456",
  "администратор", "пароль12345", "adminadmin12", "letmein12345", "welcome12345",
]);

export type PasswordCheck = { ok: true } | { ok: false; error: string };

export function checkPasswordStrength(password: string): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH)
    return { ok: false, error: `Пароль короче ${PASSWORD_MIN_LENGTH} символов` };
  if (COMMON.has(password.toLowerCase()))
    return { ok: false, error: "Такой пароль есть в списках утечек — придумайте другой" };
  // без требований к набору символов: длина надёжнее правил про спецсимволы
  return { ok: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_OPTIONS.saltBytes));
  const derived = await derive(password, salt, PBKDF2_OPTIONS.iterations);
  return `${HASH_PREFIX}i=${PBKDF2_OPTIONS.iterations}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}

/**
 * Проверка пароля. Возвращает false на любой ошибке разбора хеша,
 * а не бросает исключение: битая запись в базе не должна пускать внутрь.
 */
export async function verifyPassword(storedHash: string | null, password: string): Promise<boolean> {
  if (!storedHash) return false;
  try {
    if (!storedHash.startsWith(HASH_PREFIX)) return false;
    const parts = storedHash.slice(HASH_PREFIX.length).split("$");
    if (parts.length !== 3) return false;

    const iterations = Number(parts[0].replace(/^i=/, ""));
    const salt = fromBase64Url(parts[1]);
    const expected = fromBase64Url(parts[2]);
    if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 1_000_000 || !salt || !expected) return false;

    const actual = await derive(password, salt, iterations);
    return equalBytes(actual, expected);
  } catch {
    return false;
  }
}
