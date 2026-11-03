import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { createFixtureProvider } from "@/lib/blog-agent/embeddings/fixture";
import {
  AdminError, deleteRejected, editInternalLink, getArticle, listInternalLinks, prePublishCheck, publishArticle,
  rejectArticle, restoreToReview, setFeaturedImage, unpublishArticle, updateDraft, type DraftEdit,
} from "@/lib/blog-agent/admin/drafts";
import { addKeywords, deleteKeyword, listQueue, requeueKeyword, setPriority, skipKeyword } from "@/lib/blog-agent/admin/queue";
import { abandonRun, getRunDetail, listDrafts, overviewCounts } from "@/lib/blog-agent/admin/runs";
import { searchSiteContent } from "@/lib/blog-agent/retrieval/lexical";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, type TestDb } from "../helpers/db";
import { createDraftViaTools } from "../helpers/pipeline";
import * as fx from "../fixtures/stages";

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  await seedLinkTargets(t.exec, linkTargetSeeds());
});
afterEach(() => t.close());

async function adminError(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof AdminError) return e;
    throw e;
  }
  throw new Error("Expected an AdminError");
}

async function editFor(id: string, patch: Partial<DraftEdit> = {}): Promise<DraftEdit> {
  const a = (await getArticle(t.db, id))!;
  return {
    title: a.title, slug: a.slug, meta_title: a.meta_title ?? "", meta_description: a.meta_description ?? "",
    og_title: a.og_title ?? "", og_description: a.og_description ?? "", category: a.category ?? "", tags: (a.tags ?? []).join(", "),
    featured_image_alt: a.featured_image_alt ?? "", content: a.content, ...patch,
  };
}

describe("review and publish", () => {
  it("blocks publishing until there is a featured image, then publishes with its own canonical and searchable index", async () => {
    const { articleId, slug } = await createDraftViaTools(t);
    const check = await prePublishCheck(t.db, articleId);
    expect(check.blockers.map((b) => b.message)).toEqual(["Upload a featured image"]);
    expect((await adminError(publishArticle(t.db, articleId))).issues[0].message).toBe("Upload a featured image");

    await expect(setFeaturedImage(t.db, articleId, "http://evil.example/x.png")).rejects.toThrow(AdminError);
    await setFeaturedImage(t.db, articleId, "https://abc123.public.blob.vercel-storage.com/blog/cover-x1.webp");
    expect((await prePublishCheck(t.db, articleId)).blockers).toEqual([]);

    expect(await publishArticle(t.db, articleId)).toEqual({ slug });
    const a = (await getArticle(t.db, articleId))!;
    expect(a).toMatchObject({ status: "published", canonical_override: null });
    expect(a.published_at).not.toBeNull();
    const [idx] = await t.exec.query<{ n: number; s: number }>("SELECT count(*)::int AS n, count(*) FILTER (WHERE searchable)::int AS s FROM article_chunks WHERE article_id = $1", [articleId]);
    expect(idx.n).toBeGreaterThan(0);
    expect(idx.s).toBe(idx.n);
    expect((await searchSiteContent(t.db, "website cost in Nigeria")).map((h) => h.url)).toContain(`/blog/${slug}`);
    expect((await adminError(publishArticle(t.db, articleId))).message).toMatch(/while the article is published/);
  });

  it("unpublishes: off the site and out of search, URL and publish date kept, linking posts reported", async () => {
    const { articleId, slug } = await createDraftViaTools(t);
    await setFeaturedImage(t.db, articleId, "https://abc123.public.blob.vercel-storage.com/blog/cover-x1.webp");
    await publishArticle(t.db, articleId);
    const firstPublished = (await getArticle(t.db, articleId))!.published_at;
    await t.exec.query(
      `INSERT INTO articles (title, slug, content, content_format, status, published_at)
       VALUES ('Linker', 'linker', 'See [this guide](/blog/${slug}) for costs.', 'markdown', 'published', now()),
              ('Prefix only', 'prefix-only', 'Unrelated [post](/blog/${slug}-extra).', 'markdown', 'published', now())`,
    );

    expect(await unpublishArticle(t.db, articleId)).toEqual({ slug, linkedFrom: ["linker"] });
    const a = (await getArticle(t.db, articleId))!;
    expect(a.status).toBe("pending_review");
    expect(a.published_at).toEqual(firstPublished);
    expect((await searchSiteContent(t.db, "website cost in Nigeria")).map((h) => h.url)).not.toContain(`/blog/${slug}`);
    expect((await adminError(unpublishArticle(t.db, articleId))).message).toMatch(/while the article is pending review/);
    expect((await adminError(updateDraft(t.db, articleId, await editFor(articleId, { slug: "new-slug" })))).message).toMatch(/has been live/);

    await publishArticle(t.db, articleId);
    expect((await getArticle(t.db, articleId))!).toMatchObject({ status: "published", published_at: firstPublished, slug });
    expect((await searchSiteContent(t.db, "website cost in Nigeria")).map((h) => h.url)).toContain(`/blog/${slug}`);
  });

  it("re-checks the edited text: uncited figures and NEEDS_SOURCE block, length changes only warn", async () => {
    const { articleId } = await createDraftViaTools(t);
    await setFeaturedImage(t.db, articleId, "/assets/blog/cover.png");
    const a = (await getArticle(t.db, articleId))!;

    await updateDraft(t.db, articleId, await editFor(articleId, { content: a.content.replace("Launch in phases.", "Launch in phases; 40% of rebuilds happen within a year.") }));
    expect((await prePublishCheck(t.db, articleId)).blockers.map((b) => b.message)).toEqual([expect.stringMatching(/^Figure without a citation/)]);

    await updateDraft(t.db, articleId, await editFor(articleId, { content: `${a.content}\n\nOne more thought. [[NEEDS_SOURCE]]` }));
    expect((await prePublishCheck(t.db, articleId)).blockers.some((b) => /NEEDS_SOURCE/.test(b.message))).toBe(true);

    const shorter = a.content.replace(/\nIntegrations add cost as well\.[^\n]+\n/, "\n").replace(/\nReuse what you already have\.[^\n]+\n/, "\n").replace(/\nFinally, agree on ownership\.[^\n]+\n/, "\n");
    await updateDraft(t.db, articleId, await editFor(articleId, { content: shorter }));
    const check = await prePublishCheck(t.db, articleId);
    expect(check.blockers).toEqual([]);
    expect(check.warnings.some((w) => /^Word count \d+ is outside/.test(w.message))).toBe(true);
  });

  it("keeps the FAQ structured data in sync with the article text", async () => {
    const { articleId } = await createDraftViaTools(t);
    const a = (await getArticle(t.db, articleId))!;
    const edited = a.content.replace("Quotes differ in design depth, content and integrations.", "Quotes differ mainly in design depth and integrations.");
    await updateDraft(t.db, articleId, await editFor(articleId, { content: edited }));
    expect((await getArticle(t.db, articleId))!.faq).toEqual([fx.s7.faq[0], { question: fx.s7.faq[1].question, answer: "Quotes differ mainly in design depth and integrations." }]);
    expect((await prePublishCheck(t.db, articleId)).blockers.filter((b) => /FAQ/.test(b.message))).toEqual([]);
  });

  it("validates edits: field limits, unique slugs, and no slug change once published", async () => {
    const other = await t.exec.query<{ id: string }>("INSERT INTO articles (title, slug) VALUES ('x', 'taken-slug') RETURNING id");
    const { articleId } = await createDraftViaTools(t);
    expect((await adminError(updateDraft(t.db, articleId, await editFor(articleId, { meta_description: "Too short" })))).issues[0].path).toBe("meta_description");
    expect((await adminError(updateDraft(t.db, articleId, await editFor(articleId, { slug: "taken-slug" })))).message).toMatch(/already used/);
    expect(other).toHaveLength(1);

    await setFeaturedImage(t.db, articleId, "/assets/blog/cover.png");
    await publishArticle(t.db, articleId);
    expect((await adminError(updateDraft(t.db, articleId, await editFor(articleId, { slug: "new-slug" })))).message).toMatch(/cannot change/);
    await updateDraft(t.db, articleId, await editFor(articleId, { title: "How Much Does a Website Cost in Nigeria? Updated Guide" }));
    expect((await getArticle(t.db, articleId))!.title).toMatch(/Updated Guide/);
  });

  it("removes or retargets internal links, only to real pages", async () => {
    const { articleId } = await createDraftViaTools(t);
    const links = listInternalLinks((await getArticle(t.db, articleId))!.content);
    expect(links.map((l) => l.url)).toEqual(["/ecommerce-web-development", "/website-maintenance-and-support", "/contact-us"]);

    await editInternalLink(t.db, articleId, links[1], "/portfolio");
    await expect(editInternalLink(t.db, articleId, links[0], "/nope")).rejects.toThrow(/not a published page/);
    await editInternalLink(t.db, articleId, links[2], null);
    const after = listInternalLinks((await getArticle(t.db, articleId))!.content);
    expect(after.map((l) => l.url)).toEqual(["/ecommerce-web-development", "/portfolio"]);
    await setFeaturedImage(t.db, articleId, "/assets/blog/cover.png");
    const check = await prePublishCheck(t.db, articleId);
    expect(check.blockers).toEqual([]);
    expect(check.warnings.some((w) => /internal links; 3–3 required/.test(w.message))).toBe(true);
  });

  it("rejects with a reason (optionally re-queuing the keyword), restores, and deletes only rejected articles", async () => {
    const { articleId } = await createDraftViaTools(t);
    await expect(deleteRejected(t.db, articleId)).rejects.toThrow(/while the article is pending review/);
    await expect(rejectArticle(t.db, articleId, "no", false)).rejects.toThrow(/reason/);
    await rejectArticle(t.db, articleId, "Too generic for our audience", true);
    expect((await getArticle(t.db, articleId))!).toMatchObject({ status: "rejected", rejection_reason: "Too generic for our audience" });
    expect((await listQueue(t.db))[0]).toMatchObject({ status: "queued" });

    await restoreToReview(t.db, articleId);
    await rejectArticle(t.db, articleId, "Still not right", false);
    expect(await deleteRejected(t.db, articleId)).toEqual({ slug: "website-cost-in-nigeria" });
    expect(await getArticle(t.db, articleId)).toBeNull();
    const [run] = await t.exec.query<{ article_id: string | null; status: string }>("SELECT article_id, status FROM pipeline_runs");
    expect(run).toEqual({ article_id: null, status: "draft_created" }); // history kept
  });

  it("embeds the index on publish when a provider is configured", async () => {
    const { articleId } = await createDraftViaTools(t);
    await setFeaturedImage(t.db, articleId, "/assets/blog/cover.png");
    await publishArticle(t.db, articleId, createFixtureProvider(48));
    const [row] = await t.exec.query<{ n: number; dims: number }>("SELECT count(embedding)::int AS n, min(embedding_dims)::int AS dims FROM article_chunks WHERE article_id = $1", [articleId]);
    expect(row.dims).toBe(48);
    expect(row.n).toBeGreaterThan(0);
  });
});

describe("queue and runs", () => {
  it("adds keywords in bulk, de-duplicated, with admin priorities up to 100", async () => {
    expect(await addKeywords(t.db, "web design lagos\nWeb Design, Lagos!\n\nseo ibadan", 95, null)).toEqual({ added: 2, skipped: ["Web Design, Lagos!"] });
    await expect(addKeywords(t.db, "x keyword", 101, null)).rejects.toThrow(/0 to 100/);
    const q = await listQueue(t.db);
    expect(q.map((k) => [k.keyword, k.priority, k.source])).toEqual([["web design lagos", 95, "admin"], ["seo ibadan", 95, "admin"]]);
    await setPriority(t.db, q[1].id, 99);
    expect((await listQueue(t.db))[0].keyword).toBe("seo ibadan");
  });

  it("skips, re-queues and deletes keywords by the rules", async () => {
    await addKeywords(t.db, "alpha keyword\nbeta keyword", 50, null);
    const [a, b] = await listQueue(t.db);
    await skipKeyword(t.db, a.id);
    await expect(skipKeyword(t.db, a.id)).rejects.toThrow(/Only queued/);
    await requeueKeyword(t.db, a.id);
    await expect(requeueKeyword(t.db, a.id)).rejects.toThrow(/failed or skipped/);
    await deleteKeyword(t.db, b.id);
    expect((await listQueue(t.db)).map((k) => k.keyword)).toEqual(["alpha keyword"]);
  });

  it("shows run details and abandons stuck runs", async () => {
    const { runId, articleId } = await createDraftViaTools(t);
    const detail = (await getRunDetail(t.db, runId))!;
    expect(detail.run).toMatchObject({ status: "draft_created", article_id: articleId, article_slug: "website-cost-in-nigeria" });
    expect(detail.stages.map((s) => s.stage)).toEqual(expect.arrayContaining(["s1_keyword", "s8_applied", "s7_package", "s9_validation", "s10_index", "s11_draft"]));
    expect(detail.calls.length).toBeGreaterThan(10);
    await expect(abandonRun(t.db, runId, "a@b.c")).rejects.toThrow(/Only running/);

    await addKeywords(t.db, "stuck keyword", 90, null);
    const { toolCaller } = await import("../helpers/tools");
    const claim = await toolCaller(t, "other")("claim_next_keyword");
    const stuckRun = (claim as { ok: true; data: { run_id: string } }).data.run_id;
    await abandonRun(t.db, stuckRun, "admin@johnnybits.com");
    expect((await getRunDetail(t.db, stuckRun))!.run).toMatchObject({ status: "abandoned", keyword_status: "failed" });

    expect(await overviewCounts(t.db)).toMatchObject({ queued: 0, running: 0, needs_human: 0, pending_review: 1 });
    expect((await listDrafts(t.db)).map((d) => d.status)).toEqual(["pending_review"]);
  });
});
