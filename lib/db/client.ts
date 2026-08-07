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

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL не задан — скопируйте .env.example в .env.local");

/** Пул переживает горячую перезагрузку: иначе на каждой правке копились бы соединения */
const globalForDb = globalThis as unknown as { klmSql?: ReturnType<typeof postgres> };

export const sql =
  globalForDb.klmSql ??
  postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 20,
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") globalForDb.klmSql = sql;

export const db = drizzle(sql, { schema });
export { schema };
