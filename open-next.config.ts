import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter configuration for Cloudflare Workers.
 * Keep this file in the repository: CI builds are non-interactive and cannot
 * generate it on demand.
 *
 * buildCommand задан явно, чтобы сборка воркера не зависела от того, что лежит
 * в скрипте `build`. По умолчанию OpenNext вызывает `npm run build`, и если тот
 * когда-нибудь снова станет `opennextjs-cloudflare build`, получится рекурсия.
 */
const config = { ...defineCloudflareConfig(), buildCommand: "next build" };

export default config;
