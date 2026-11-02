import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, legacyHtml, type TestDb } from "../helpers/db";
import { backfillLegacyPosts, seedAuthors } from "@/lib/blog-agent/seed/seed";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";

let t: TestDb;
vi.mock("@/db/client", () => ({ getDb: () => t.db }));

beforeAll(async () => {
  t = await createTestDb();
  await t.exec.query(
    `INSERT INTO blog_posts (title, slug, excerpt, content, tag, published, created_at) VALUES
     ('Older', 'older-post', 'e1', $1, 'SEO', true, '2026-03-01T00:00:00Z'),
     ('Newer', 'newer-post', 'e2', $1, 'Web Design', true, '2026-04-01T00:00:00Z'),
     ('Hidden', 'hidden-post', 'e3', $1, 'SEO', false, '2026-05-01T00:00:00Z')`,
    [legacyHtml(900)],
  );
  await backfillLegacyPosts(t.exec);
  await seedAuthors(t.exec, getBrandContext().authors);
});
afterAll(() => t.close());

describe("public blog queries", () => {
  it("lists only published posts, newest first, with real read times", async () => {
    const { listPublishedPosts } = await import("@/lib/blog/queries");
    const posts = await listPublishedPosts();
    expect(posts.map((p) => p.slug)).toEqual(["newer-post", "older-post"]);
    expect(posts[0]).toMatchObject({ category: "Web Design", summary: "e2", readingMinutes: 4 });
    expect(posts[0].publishedAt).toBeInstanceOf(Date);
  });

  it("returns a published post with its author, and null for drafts or unknown slugs", async () => {
    const { getPublishedPost } = await import("@/lib/blog/queries");
    expect(await getPublishedPost("hidden-post")).toBeNull();
    expect(await getPublishedPost("nope")).toBeNull();

    const post = await getPublishedPost("older-post");
    expect(post).toMatchObject({ slug: "older-post", contentFormat: "html", author: null });

    await t.exec.query("UPDATE articles SET author_id = (SELECT id FROM authors WHERE slug = 'odoh-john') WHERE slug = 'newer-post'");
    expect((await getPublishedPost("newer-post"))?.author).toMatchObject({ name: "Odoh John", jobTitle: "Software Developer" });
  });

  it("feeds the sitemap with every published slug (regression: sitemap had 0 posts)", async () => {
    const { listPublishedSlugs } = await import("@/lib/blog/queries");
    expect((await listPublishedSlugs()).map((p) => p.slug).sort()).toEqual(["newer-post", "older-post"]);
  });
});
