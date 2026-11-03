import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { searchSiteContent } from "@/lib/blog-agent/retrieval/lexical";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, type TestDb } from "../helpers/db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
  await seedLinkTargets(t.exec, linkTargetSeeds());
  const add = (slug: string, title: string, content: string, status: string) =>
    t.exec.query(
      `INSERT INTO articles (title, slug, summary, content, content_format, primary_keyword, status, published_at)
       VALUES ($1, $2, $3, $4, 'html', $5, $6::article_status, CASE WHEN $6 = 'published' THEN now() END)`,
      [title, slug, title, content, title.toLowerCase(), status],
    );
  await add("best-ecommerce-payment-gateways-nigeria-2026", "The Best E-commerce Payment Gateways in Nigeria", "<p>Paystack, Flutterwave and Monnify compared for online stores.</p>", "published");
  await add("seo-in-nigeria-local-ranking-2026", "SEO in Nigeria: How to Rank Locally", "<p>Google Business Profile and local search.</p>", "published");
  await add("draft-about-paystack", "Paystack Checkout Draft", "<p>Paystack paystack paystack.</p>", "pending_review");
});
afterAll(() => t.close());

describe("searchSiteContent (lexical)", () => {
  it("finds relevant articles and service pages for a natural-language query", async () => {
    const hits = await searchSiteContent(t.db, "how to accept Paystack payments on an online store in Nigeria");
    const urls = hits.map((h) => h.url);
    expect(urls[0]).toBe("/blog/best-ecommerce-payment-gateways-nigeria-2026");
    expect(urls).toContain("/ecommerce-web-development");
    expect(hits.every((h) => h.score >= 0 && h.score <= 1)).toBe(true);
  });

  it("never returns unpublished articles", async () => {
    const hits = await searchSiteContent(t.db, "paystack checkout draft");
    expect(hits.map((h) => h.url)).not.toContain("/blog/draft-about-paystack");
  });

  it("ranks the SEO service and article for an SEO query", async () => {
    const urls = (await searchSiteContent(t.db, "local SEO Google ranking")).map((h) => h.url);
    expect(urls.slice(0, 3)).toEqual(expect.arrayContaining(["/blog/seo-in-nigeria-local-ranking-2026", "/search-engine-optimization-seo"]));
  });

  it("handles empty and stop-word-only queries", async () => {
    expect(await searchSiteContent(t.db, "   ")).toEqual([]);
    await expect(searchSiteContent(t.db, "the and of")).resolves.toBeInstanceOf(Array);
  });

  it("caps the limit", async () => {
    expect((await searchSiteContent(t.db, "web", { limit: 500 })).length).toBeLessThanOrEqual(50);
  });
});
