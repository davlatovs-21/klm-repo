import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Привязки Cloudflare нужны только для `next dev`: initOpenNextCloudflareForDev
// поднимает miniflare через wrangler. Своей проверки окружения у неё нет, поэтому
// без этого условия она запускается и в сборке — в том числе на Vercel, где
// wrangler не нужен вовсе.
if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
