import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    cpus: 2,
    memoryBasedWorkersCount: true,
  },
  outputFileTracingExcludes: {
    "/*": [
      "./mobile/**",
      "./prisma_db/**",
      "./scripts/**",
      "./public/**",
      "./.git/**",
      "./.next/cache/**",
    ],
  },
};

export default nextConfig;
