import { defineConfig } from "drizzle-kit";

/**
 * Миграции версионируемые и только вперёд — раздел 10.2.7 ТЗ.
 * Откатный сценарий описывается в релизе, а не генерируется автоматически.
 */
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/klm_dev",
  },
  strict: true,
  verbose: true,
});
