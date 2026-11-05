import { listPublishedSlugs } from "@/lib/blog/queries";
import { sitemapEntries, sitemapXml } from "@/lib/blog/sitemap";

// Read from the database on each (CDN-cached) request. The build-time snapshot that ISR kept for 24 hours left newly
// published posts out until it expired, because on-demand revalidation of this route did not take effect on Vercel.
export const dynamic = "force-dynamic";

/** Vercel's CDN keeps a copy for 10 minutes and may serve it 10 minutes more while refreshing: new posts appear within ~10–20 minutes. */
const CACHE = "public, max-age=0, s-maxage=600, stale-while-revalidate=600";

export async function GET() {
  let posts: { slug: string; updatedAt: Date }[];
  try {
    posts = await listPublishedSlugs();
  } catch (error) {
    // A sitemap without the posts would be cached and believed; 503 makes crawlers retry later instead.
    console.error("Sitemap: failed to load blog posts:", error);
    return new Response("Sitemap temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "600", "Cache-Control": "no-store" },
    });
  }
  return new Response(sitemapXml(sitemapEntries(posts)), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": CACHE },
  });
}
