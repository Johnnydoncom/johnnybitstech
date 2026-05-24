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
      {
        source: '/e-commerce-web-design-development',
        destination: '/ecommerce-web-development',
        permanent: true
      },
      {
        source: '/e-commerce-web-development',
        destination: '/ecommerce-web-development',
        permanent: true
      },
      {
        source: '/corporate-web-design-company',
        destination: '/corporate-web-design-nigeria',
        permanent: true
      },
      {
        source: '/web-design-development-nigeria',
        destination: '/corporate-web-design-nigeria',
        permanent: true
      },
      {
        source: '/web-development',
        destination: '/web-development-services',
        permanent: true
      },
    ]
  }
};


export default nextConfig;
