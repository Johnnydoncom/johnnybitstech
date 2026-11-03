import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { createFixtureProvider } from "@/lib/blog-agent/embeddings/fixture";
import { indexPublishedArticles } from "@/lib/blog-agent/indexing/backfill";
import { vectorSearch } from "@/lib/blog-agent/retrieval/vector";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { backfillLegacyPosts, seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, legacyHtml, type TestDb } from "../helpers/db";

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  await seedLinkTargets(t.exec, linkTargetSeeds());
  await t.exec.query(
    `INSERT INTO blog_posts (title, slug, content, tag, published) VALUES
     ('Paystack vs Flutterwave', 'payment-gateways', $1, 'E-commerce', true),
     ('Hidden draft', 'hidden', $1, 'SEO', false)`,
    [`<p>Intro about payment gateways.</p><h2>Fees</h2>${legacyHtml(200)}<h2>Checkout</h2><p>Paystack checkout flow.</p>`],
  );
  await backfillLegacyPosts(t.exec, "odoh-john");
});
afterEach(() => t.close());

describe("indexPublishedArticles", () => {
  it("indexes published legacy posts only, as searchable, and is idempotent", async () => {
    expect(await indexPublishedArticles(t.db, null)).toMatchObject({ articlesIndexed: 1, articlesUnchanged: 0, linkTargetsEmbedded: 0 });
    const rows = await t.exec.query<{ scope: string; section_key: string; searchable: boolean }>(
      "SELECT c.scope, c.section_key, c.searchable FROM article_chunks c JOIN articles a ON a.id = c.article_id WHERE a.slug = 'payment-gateways' ORDER BY c.scope, c.section_key",
    );
    expect(rows.map((r) => `${r.scope}:${r.section_key}`)).toEqual(["full:", "intro:", "section:checkout", "section:fees"]);
    expect(rows.every((r) => r.searchable)).toBe(true);
    expect(await indexPublishedArticles(t.db, null)).toMatchObject({ articlesIndexed: 0, articlesUnchanged: 1 });
  });

  it("embeds articles and link targets when a provider is set, and re-indexes when the model changes", async () => {
    await indexPublishedArticles(t.db, null);
    const provider = createFixtureProvider(32);
    const r = await indexPublishedArticles(t.db, provider);
    expect(r).toMatchObject({ articlesIndexed: 1, linkTargetsEmbedded: linkTargetSeeds().length });
    const [q] = (await provider.embed(["Paystack checkout fees for online stores"], "query")).vectors;
    const urls = (await vectorSearch(t.db, q, provider.model)).map((h) => h.url);
    expect(urls).toContain("/blog/payment-gateways");
    expect(urls).not.toContain("/blog/hidden");
    expect(urls).toContain("/ecommerce-web-development");
    expect(await indexPublishedArticles(t.db, provider)).toMatchObject({ articlesIndexed: 0, linkTargetsEmbedded: 0 });
  });

  it("drops sections that were removed from an edited post", async () => {
    await indexPublishedArticles(t.db, null);
    await t.exec.query("UPDATE articles SET content = '<p>Intro.</p><h2>Fees</h2><p>Only fees now.</p>' WHERE slug = 'payment-gateways'");
    expect(await indexPublishedArticles(t.db, null)).toMatchObject({ articlesIndexed: 1 });
    const keys = await t.exec.query<{ k: string }>("SELECT scope || ':' || section_key AS k FROM article_chunks ORDER BY 1");
    expect(keys.map((r) => r.k)).toEqual(["full:", "intro:", "section:fees"]);
  });
});
