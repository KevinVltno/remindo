import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
