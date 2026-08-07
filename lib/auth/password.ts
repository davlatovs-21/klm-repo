import { hash, verify } from "@node-rs/argon2";

/**
 * Пароли — раздел 12.1 ТЗ.
 *
 * argon2id с памятью 64 МБ и тремя итерациями: параметры заданы ТЗ и вынесены
 * в константы, чтобы их можно было поднять одним местом, когда железо позволит.
 * Соль argon2 генерирует сам и кладёт внутрь строки хеша.
 */
export const ARGON_OPTIONS = {
  memoryCost: 64 * 1024, // 64 МБ
  timeCost: 3,
  parallelism: 1,
} as const;

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

export const hashPassword = (password: string) => hash(password, ARGON_OPTIONS);

/**
 * Проверка пароля. Возвращает false на любой ошибке разбора хеша,
 * а не бросает исключение: битая запись в базе не должна пускать внутрь.
 */
export async function verifyPassword(storedHash: string | null, password: string): Promise<boolean> {
  if (!storedHash) return false;
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}
