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
  // Logotipos enviados como imagem embutida (até ~800 KB) passam pela Server Action
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
