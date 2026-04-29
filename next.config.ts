import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsHmrCache: true,
    optimizePackageImports: ["lucide-react"],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};


export default nextConfig;
