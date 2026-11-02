import { SITE_URL } from "@/config/site";
import { listPublishedSlugs } from "@/lib/blog/queries";

export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  const BASE_URL = SITE_URL;

  // Static pages
  const staticPages = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: "1.0" },
    { url: `${BASE_URL}/about-the-web-design-company`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/services`, changeFrequency: "monthly", priority: "0.9" },
    { url: `${BASE_URL}/corporate-web-design-nigeria`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/web-development-services`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/search-engine-optimization-seo`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/ecommerce-web-development`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/mobile-apps-development`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/graphics-design`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/website-maintenance-and-support`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: "0.7" },
    { url: `${BASE_URL}/portfolio`, changeFrequency: "monthly", priority: "0.7" },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: "0.8" },
    { url: `${BASE_URL}/contact-us`, changeFrequency: "yearly", priority: "0.6" },
  ];

  // Dynamic blog posts from database
  let blogPages: Array<{ url: string; lastModified: string; changeFrequency: string; priority: string }> = [];
  try {
    const posts = await listPublishedSlugs();
    blogPages = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt.toISOString(),
      changeFrequency: "weekly",
      priority: "0.7",
    }));
  } catch (error) {
    console.error("Sitemap: Failed to fetch blog posts:", error);
  }

  // Generate XML
  const currentDate = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Add static pages
  for (const page of staticPages) {
    xml += `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }

  // Add dynamic pages
  for (const page of blogPages) {
    xml += `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastModified}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }

  xml += `
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
