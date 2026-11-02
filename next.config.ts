import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the local test runner build into its own folder while `next dev` keeps using .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    serverComponentsHmrCache: true,
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    // Featured images uploaded from the blog admin are stored in Vercel Blob.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async rewrites() {
    return [
      // OAuth discovery for the MCP connector (RFC 9728 / RFC 8414), served by route handlers.
      { source: '/.well-known/oauth-protected-resource', destination: '/api/oauth/well-known/protected-resource' },
      { source: '/.well-known/oauth-protected-resource/:path*', destination: '/api/oauth/well-known/protected-resource' },
      { source: '/.well-known/oauth-authorization-server', destination: '/api/oauth/well-known/authorization-server' },
      { source: '/.well-known/oauth-authorization-server/:path*', destination: '/api/oauth/well-known/authorization-server' },
    ]
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
      // Legacy /services/* paths (old footer links and earlier site versions) → canonical flat service URLs.
      { source: '/services/web-design', destination: '/corporate-web-design-nigeria', permanent: true },
      { source: '/services/web-development', destination: '/web-development-services', permanent: true },
      { source: '/services/seo-digital-marketing', destination: '/search-engine-optimization-seo', permanent: true },
      { source: '/services/ecommerce', destination: '/ecommerce-web-development', permanent: true },
      { source: '/services/mobile-apps', destination: '/mobile-apps-development', permanent: true },
      { source: '/services/website-maintenance', destination: '/website-maintenance-and-support', permanent: true },
      {
        source: '/services/:slug(corporate-web-design-nigeria|web-development-services|search-engine-optimization-seo|ecommerce-web-development|mobile-apps-development|graphics-design|website-maintenance-and-support)',
        destination: '/:slug',
        permanent: true
      },
    ]
  }
};


export default nextConfig;
