import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Соединение с базой. Прикладной код импортирует НЕ отсюда, а из lib/db/index.ts —
 * там стоит маркер server-only, который ломает сборку при попытке утащить строку
 * подключения в клиентский бандл.
 *
 * Этот модуль отдельно, потому что server-only бросает исключение вне Next:
 * миграции, сид и тесты запускаются обычным Node и должны работать.
 */

/** Пул переживает горячую перезагрузку: иначе на каждой правке копились бы соединения */
const globalForDb = globalThis as unknown as { klmSql?: ReturnType<typeof postgres> };

/**
 * Соединение поднимается при первом обращении, а не при импорте модуля.
 * Иначе `next build` падает на сборе page data: он вычисляет модули страниц,
 * где DATABASE_URL ещё не нужен, но уже обязателен.
 */
function connect() {
  if (globalForDb.klmSql) return globalForDb.klmSql;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL не задан — скопируйте .env.example в .env.local");

  const instance = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 20,
    onnotice: () => {},
  });

  globalForDb.klmSql = instance;
  return instance;
}

/**
 * Прокси, чтобы `sql` остался и тегом шаблона (sql`select ...`), и объектом
 * с методами (.begin, .end). Цель — функция: только она допускает ловушку apply.
 */
export const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  apply: (_t, _this, args) =>
    (connect() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop) => Reflect.get(connect(), prop),
  has: (_t, prop) => Reflect.has(connect(), prop),
}) as ReturnType<typeof postgres>;

let drizzleInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get: (_t, prop) => {
    drizzleInstance ??= drizzle(connect(), { schema });
    return Reflect.get(drizzleInstance, prop);
  },
});
export { schema };
