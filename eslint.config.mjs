import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Сборочный вывод Vercel (`vercel build`) — не наш код.
    ".vercel/**",
    "demo-hosting/**",
    "online-store-klm/**",
    "public/ocr/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  /**
   * Граница расчётного ядра — раздел 19.2 ТЗ.
   * lib/core/ не знает ни про интерфейс, ни про базу, ни про Next.js. Это условие
   * тестируемости, воспроизводимости расчёта и продажи ядра отдельно в white-label.
   * Проверяется штатным no-restricted-imports, без внешнего плагина.
   */
  /**
   * Соединение с базой берётся только из lib/db/index.ts — там маркер server-only.
   * Прямой импорт lib/db/client в обход него утащил бы строку подключения в бандл.
   */
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/dal/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/lib/db/client", "**/db/client"], message: "Импортируйте db из @/lib/db — там защита server-only." },
        ],
      }],
    },
  },
  {
    files: ["lib/core/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/app/*", "@/components/*", "@/lib/db/*", "@/lib/dal/*", "@/lib/services/*"], message: "Ядро не зависит от интерфейса и базы (ТЗ 19.2)." },
          { group: ["next", "next/*", "react", "react-dom", "server-only"], message: "Ядро — чистые функции без фреймворка (ТЗ 19.2)." },
        ],
      }],
    },
  },
]);

export default eslintConfig;
