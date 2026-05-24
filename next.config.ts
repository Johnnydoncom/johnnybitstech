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
  async redirects() {
    return [
      {
        source: '/about',
        destination: '/about-the-web-design-company',
        permanent: true,
      },
      {
        source: '/about-us',
        destination: '/about-the-web-design-company',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/contact-us',
        permanent: true,
      },
    ]
  },
};


export default nextConfig;
