import { SITE_URL } from "@/config/site";
import { query } from "@/lib/db";

export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  const BASE_URL = SITE_URL;
  
  // Static pages
  const staticPages = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: "1.0" },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/services`, changeFrequency: "monthly", priority: "0.9" },
    { url: `${BASE_URL}/services/web-design`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/services/web-development`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/services/seo-digital-marketing`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/services/ecommerce`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/services/mobile-apps`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/services/graphics-design`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/services/website-maintenance`, changeFrequency: "monthly", priority: "0.8" },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: "0.7" },
    { url: `${BASE_URL}/portfolio`, changeFrequency: "monthly", priority: "0.7" },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: "0.8" },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: "0.6" },
  ];

  // Dynamic blog posts from database
  let blogPages: Array<{ url: string; lastModified: string; changeFrequency: string; priority: string }> = [];
  try {
    const posts = await query<{ slug: string; updated_at: Date }>(
      "SELECT slug, updated_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC"
    );
    blogPages = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at).toISOString(),
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
