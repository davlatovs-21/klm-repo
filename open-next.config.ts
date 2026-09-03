import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter configuration for Cloudflare Workers.
 * Keep this file in the repository: CI builds are non-interactive and cannot
 * generate it on demand.
 *
 * buildCommand вызывается вместо `npm run build`. Без него получается рекурсия:
 * скрипт build теперь сам запускает opennextjs-cloudflare build, потому что
 * Cloudflare Workers Builds выполняет именно `npm run build`, а `wrangler deploy`
 * сразу передаёт управление `opennextjs-cloudflare deploy` и ждёт готовый .open-next.
 */
const config = { ...defineCloudflareConfig(), buildCommand: "next build" };

export default config;
