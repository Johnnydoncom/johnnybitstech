import { SITE_URL } from "@/config/site";

export type SitemapEntry = { loc: string; lastmod?: Date; changefreq?: string; priority?: string };

/** Site pages other than blog posts. They get no lastmod: Google ignores lastmod site-wide once it proves inaccurate. */
export const STATIC_PAGES: readonly { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about-the-web-design-company", changefreq: "monthly", priority: "0.8" },
  { path: "/services", changefreq: "monthly", priority: "0.9" },
  { path: "/corporate-web-design-nigeria", changefreq: "monthly", priority: "0.8" },
  { path: "/web-development-services", changefreq: "monthly", priority: "0.8" },
  { path: "/search-engine-optimization-seo", changefreq: "monthly", priority: "0.8" },
  { path: "/ecommerce-web-development", changefreq: "monthly", priority: "0.8" },
  { path: "/mobile-apps-development", changefreq: "monthly", priority: "0.8" },
  { path: "/graphics-design", changefreq: "monthly", priority: "0.8" },
  { path: "/website-maintenance-and-support", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.7" },
  { path: "/portfolio", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/contact-us", changefreq: "yearly", priority: "0.6" },
];

const xmlEscape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/**
 * Every URL for the sitemap: static pages, then published posts with their real last-modified date.
 * The blog index's lastmod is its newest post's, so a new post also signals that /blog changed.
 */
export function sitemapEntries(posts: readonly { slug: string; updatedAt: Date }[], siteUrl = SITE_URL): SitemapEntry[] {
  const base = siteUrl.replace(/\/$/, "");
  const newest = posts.reduce<Date | undefined>((max, p) => (!max || p.updatedAt > max ? p.updatedAt : max), undefined);
  return [
    ...STATIC_PAGES.map((p) => ({
      loc: `${base}${p.path === "/" ? "/" : p.path}`,
      changefreq: p.changefreq,
      priority: p.priority,
      ...(p.path === "/blog" && newest ? { lastmod: newest } : {}),
    })),
    ...posts.map((p) => ({ loc: `${base}/blog/${encodeURIComponent(p.slug)}`, lastmod: p.updatedAt, changefreq: "weekly", priority: "0.7" })),
  ];
}

export function sitemapXml(entries: readonly SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${xmlEscape(e.loc)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod.toISOString()}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
