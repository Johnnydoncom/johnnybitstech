import { describe, expect, it } from "vitest";
import { articleJsonLd, blogIndexMetadata, postMetadata, serializeJsonLd } from "@/lib/blog/seo";
import type { BlogPost } from "@/lib/blog/types";

const post: BlogPost = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "seo-in-nigeria-local-ranking-2026",
  title: "SEO in Nigeria: How to Rank Locally on Google in 2026",
  summary: "Summary",
  content: "<p>x</p>",
  contentFormat: "html",
  category: "SEO",
  tags: ["SEO", "Local SEO"],
  featuredImage: "/assets/blog/nigeria_seo_ranking.png",
  featuredImageAlt: null,
  metaTitle: "SEO in Nigeria: 2026 Local Ranking Guide | Johnnybits",
  metaDescription: "Meta description",
  ogTitle: null,
  ogDescription: null,
  canonicalOverride: null,
  faq: [{ question: "Q?", answer: "A." }],
  wordCount: 1200,
  readingMinutes: 5,
  publishedAt: new Date("2026-03-01T10:00:00Z"),
  updatedAt: new Date("2026-03-02T10:00:00Z"),
  author: { name: "Odoh John", slug: "odoh-john", jobTitle: "Software Developer", url: "https://johnnybits.com/about-the-web-design-company", sameAs: [] },
};

const url = "https://johnnybits.com/blog/seo-in-nigeria-local-ranking-2026";

describe("canonical URLs (regression: posts and /blog pointed at the homepage)", () => {
  it("post canonical and og:url are the post's own URL", () => {
    const meta = postMetadata(post);
    expect(meta.alternates?.canonical).toBe(url);
    expect((meta.openGraph as { url?: string }).url).toBe(url);
  });

  it("respects an explicit canonical override", () => {
    expect(postMetadata({ ...post, canonicalOverride: "https://example.com/original" }).alternates?.canonical).toBe("https://example.com/original");
  });

  it("/blog canonical and og:url are /blog", () => {
    const meta = blogIndexMetadata();
    expect(meta.alternates?.canonical).toBe("https://johnnybits.com/blog");
    expect((meta.openGraph as { url?: string }).url).toBe("https://johnnybits.com/blog");
  });

  it("uses the stored meta title as-is and brands a bare title once", () => {
    expect(postMetadata(post).title).toEqual({ absolute: post.metaTitle });
    expect(postMetadata({ ...post, metaTitle: null }).title).toEqual({ absolute: `${post.title} | Johnnybits Technology` });
  });
});

describe("article JSON-LD", () => {
  const graph = (p: BlogPost, includeFaq = false) => articleJsonLd(p, { includeFaq })["@graph"] as Record<string, unknown>[];
  const byType = (g: Record<string, unknown>[], type: string) => g.find((n) => n["@type"] === type);

  it("describes the post with a Person author, absolute image and breadcrumb", () => {
    const g = graph(post);
    const article = byType(g, "BlogPosting")!;
    expect(article).toMatchObject({
      "@id": `${url}#article`,
      url,
      headline: post.title,
      datePublished: "2026-03-01T10:00:00.000Z",
      dateModified: "2026-03-02T10:00:00.000Z",
      image: ["https://johnnybits.com/assets/blog/nigeria_seo_ranking.png"],
      wordCount: 1200,
    });
    expect(article.author).toMatchObject({ "@type": "Person", name: "Odoh John", jobTitle: "Software Developer" });
    expect(byType(g, "BreadcrumbList")).toBeDefined();
    expect(byType(g, "Organization")).toBeDefined();
  });

  it("falls back to the Organization as author for legacy posts", () => {
    const article = byType(graph({ ...post, author: null }), "BlogPosting")!;
    expect(article.author).toEqual({ "@id": "https://johnnybits.com/#organization" });
  });

  it("includes FAQPage only when enabled", () => {
    expect(byType(graph(post), "FAQPage")).toBeUndefined();
    expect(byType(graph(post, true), "FAQPage")).toMatchObject({ mainEntity: [{ name: "Q?", acceptedAnswer: { text: "A." } }] });
  });

  it("serialises safely inside a script tag", () => {
    expect(serializeJsonLd({ t: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
