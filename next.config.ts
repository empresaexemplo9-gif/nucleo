import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  // Logotipos em alta resolução e contratos em PDF (até 15 MB) passam pelas Server Actions
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};

export default nextConfig;
