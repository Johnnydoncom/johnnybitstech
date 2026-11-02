import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { backfillLegacyPosts, seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, legacyHtml, type TestDb } from "../helpers/db";

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.close());

async function addLegacy(slug: string, opts: { published?: boolean; words?: number; image?: string | null } = {}) {
  await t.exec.query(
    `INSERT INTO blog_posts (title, slug, excerpt, content, tag, published, meta_title, meta_description, featured_image, created_at, updated_at)
     VALUES ($1, $2, 'Excerpt', $3, 'SEO', $4, 'Meta T', 'Meta D', $5, '2026-03-10T09:00:00Z', '2026-03-12T09:00:00Z')`,
    [`Title ${slug}`, slug, legacyHtml(opts.words ?? 450), opts.published ?? true, "image" in opts ? opts.image : `/assets/blog/${slug}.png`],
  );
}

describe("backfillLegacyPosts", () => {
  it("copies posts with the same slug, dates, status and real reading time", async () => {
    await addLegacy("seo-in-nigeria-local-ranking-2026", { words: 1125 });
    await addLegacy("draft-post", { published: false, image: null });

    const report = await backfillLegacyPosts(t.exec);
    expect(report).toMatchObject({ found: 2, inserted: ["seo-in-nigeria-local-ranking-2026", "draft-post"], slugConflicts: [] });

    const rows = await t.exec.query<Record<string, unknown>>("SELECT * FROM articles ORDER BY legacy_id");
    expect(rows[0]).toMatchObject({
      slug: "seo-in-nigeria-local-ranking-2026",
      status: "published",
      content_format: "html",
      summary: "Excerpt",
      category: "SEO",
      tags: ["SEO"],
      meta_title: "Meta T",
      featured_image: "/assets/blog/seo-in-nigeria-local-ranking-2026.png",
      reading_minutes: 5,
    });
    expect(new Date(rows[0].published_at as string).toISOString()).toBe("2026-03-10T09:00:00.000Z");
    expect(new Date(rows[0].updated_at as string).toISOString()).toBe("2026-03-12T09:00:00.000Z");
    expect(rows[0].content_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[1]).toMatchObject({ status: "draft", published_at: null, featured_image: null });
  });

  it("is idempotent and never overwrites later edits", async () => {
    await addLegacy("a-post");
    await backfillLegacyPosts(t.exec);
    await t.exec.query("UPDATE articles SET title = 'Edited' WHERE slug = 'a-post'");

    const second = await backfillLegacyPosts(t.exec);
    expect(second).toMatchObject({ inserted: [], alreadyPresent: ["a-post"] });
    const [row] = await t.exec.query<{ title: string }>("SELECT title FROM articles");
    expect(row.title).toBe("Edited");
  });

  it("reports (and skips) a slug already used by a non-legacy article", async () => {
    await t.exec.query("INSERT INTO articles (title, slug) VALUES ('New', 'taken')");
    await addLegacy("taken");
    expect(await backfillLegacyPosts(t.exec)).toMatchObject({ inserted: [], slugConflicts: ["taken"] });
  });

  it("does nothing when there is no legacy table", async () => {
    await t.exec.exec("DROP TABLE blog_posts");
    expect(await backfillLegacyPosts(t.exec)).toEqual({ found: 0, inserted: [], alreadyPresent: [], slugConflicts: [], authorAssigned: 0 });
  });

  it("credits the default author on new and previously backfilled posts without touching updated_at", async () => {
    await addLegacy("first-post");
    await backfillLegacyPosts(t.exec); // backfilled before any author existed
    await seedAuthors(t.exec, getBrandContext().authors);
    await addLegacy("second-post");

    const report = await backfillLegacyPosts(t.exec, "odoh-john");
    expect(report).toMatchObject({ inserted: ["second-post"], authorAssigned: 1 });

    const rows = await t.exec.query<{ slug: string; author: string; updated_at: string }>(
      "SELECT a.slug, au.name AS author, a.updated_at FROM articles a JOIN authors au ON au.id = a.author_id ORDER BY a.slug",
    );
    expect(rows.map((r) => [r.slug, r.author])).toEqual([["first-post", "Odoh John"], ["second-post", "Odoh John"]]);
    for (const r of rows) expect(new Date(r.updated_at).toISOString()).toBe("2026-03-12T09:00:00.000Z");

    // Trigger is re-enabled afterwards: a real edit still bumps updated_at.
    await t.exec.query("UPDATE articles SET title = 'Edited' WHERE slug = 'first-post'");
    const [edited] = await t.exec.query<{ updated_at: string }>("SELECT updated_at FROM articles WHERE slug = 'first-post'");
    expect(new Date(edited.updated_at).getTime()).toBeGreaterThan(Date.parse("2026-03-12T09:00:00Z"));
  });

  it("fails loudly if the default author has not been seeded", async () => {
    await addLegacy("a-post");
    await expect(backfillLegacyPosts(t.exec, "odoh-john")).rejects.toThrow(/Default author/);
  });
});

describe("seedLinkTargets / seedAuthors", () => {
  it("seeds only canonical URLs, idempotently, and deactivates removed ones", async () => {
    const seeds = linkTargetSeeds();
    expect(seeds.every((s) => !s.url.startsWith("/services/"))).toBe(true);
    await t.exec.query("INSERT INTO link_targets (url, title, type) VALUES ('/old-page', 'Old', 'page')");

    const first = await seedLinkTargets(t.exec, seeds);
    expect(first.deactivated).toEqual(["/old-page"]);
    await seedLinkTargets(t.exec, seeds);

    const rows = await t.exec.query<{ url: string; is_active: boolean }>("SELECT url, is_active FROM link_targets ORDER BY url");
    expect(rows.filter((r) => r.is_active).map((r) => r.url).sort()).toEqual(seeds.map((s) => s.url).sort());
    expect(rows.find((r) => r.url === "/old-page")?.is_active).toBe(false);
  });

  it("upserts authors from the brand context", async () => {
    const { authors } = getBrandContext();
    await seedAuthors(t.exec, authors);
    await seedAuthors(t.exec, authors);
    const rows = await t.exec.query<{ slug: string; name: string; job_title: string }>("SELECT slug, name, job_title FROM authors");
    expect(rows).toEqual([{ slug: "odoh-john", name: "Odoh John", job_title: "Software Developer" }]);
  });
});
