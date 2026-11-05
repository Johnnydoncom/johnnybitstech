import { afterEach, describe, expect, it, vi } from "vitest";
import { sitemapEntries, sitemapXml, STATIC_PAGES } from "@/lib/blog/sitemap";

const listPublishedSlugs = vi.fn();
vi.mock("@/lib/blog/queries", () => ({ listPublishedSlugs: () => listPublishedSlugs() }));

afterEach(() => listPublishedSlugs.mockReset());

const posts = [
  { slug: "website-cost-in-nigeria", updatedAt: new Date("2026-11-05T05:55:12.604Z") },
  { slug: "mobile-app-development-cost-nigeria", updatedAt: new Date("2026-11-04T16:41:05.691Z") },
];

describe("sitemap", () => {
  it("lists every static page and every published post, posts with their real lastmod", () => {
    const entries = sitemapEntries(posts, "https://johnnybits.com");
    expect(entries).toHaveLength(STATIC_PAGES.length + 2);
    expect(entries[0].loc).toBe("https://johnnybits.com/");
    expect(entries.find((e) => e.loc.endsWith("/blog/website-cost-in-nigeria"))?.lastmod?.toISOString()).toBe("2026-11-05T05:55:12.604Z");
  });

  it("gives static pages no invented lastmod, and the blog index its newest post's date", () => {
    const entries = sitemapEntries(posts, "https://johnnybits.com/");
    expect(entries.find((e) => e.loc === "https://johnnybits.com/services")?.lastmod).toBeUndefined();
    expect(entries.find((e) => e.loc === "https://johnnybits.com/blog")?.lastmod).toEqual(posts[0].updatedAt);
    expect(sitemapEntries([], "https://johnnybits.com").find((e) => e.loc.endsWith("/blog"))?.lastmod).toBeUndefined();
  });

  it("renders valid, escaped sitemap XML", () => {
    const xml = sitemapXml([{ loc: "https://x.test/a?b=1&c=2", lastmod: new Date("2026-01-02T03:04:05Z") }, { loc: "https://x.test/" }]);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://x.test/a?b=1&amp;c=2</loc>");
    expect(xml).toContain("<lastmod>2026-01-02T03:04:05.000Z</lastmod>");
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml.trim().endsWith("</urlset>")).toBe(true);
  });

  it("serves the current posts on every request, cached briefly at the CDN", async () => {
    const { GET, dynamic } = await import("@/app/sitemap.xml/route");
    expect(dynamic).toBe("force-dynamic");
    listPublishedSlugs.mockResolvedValueOnce(posts.slice(1));
    expect(await (await GET()).text()).not.toContain("website-cost-in-nigeria");
    listPublishedSlugs.mockResolvedValueOnce(posts); // a post published since
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("cache-control")).toMatch(/s-maxage=600/);
    expect(await res.text()).toContain("<loc>https://johnnybits.com/blog/website-cost-in-nigeria</loc>");
  });

  it("answers 503 (not a post-less sitemap) when the database is unavailable", async () => {
    const { GET } = await import("@/app/sitemap.xml/route");
    listPublishedSlugs.mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET();
    spy.mockRestore();
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("retry-after")).toBe("600");
  });

  it("robots.txt allows the site, keeps crawlers out of admin/API/OAuth and points to the sitemap", async () => {
    const robots = (await import("@/app/robots")).default();
    expect(robots.sitemap).toBe("https://johnnybits.com/sitemap.xml");
    expect(robots.rules).toEqual([{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/oauth/"] }]);
  });
});
