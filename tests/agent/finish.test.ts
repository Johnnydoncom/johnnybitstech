import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { createFixtureProvider } from "@/lib/blog-agent/embeddings/fixture";
import { searchSiteContent } from "@/lib/blog-agent/retrieval/lexical";
import { vectorSearch } from "@/lib/blog-agent/retrieval/vector";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, type TestDb } from "../helpers/db";
import { toolCaller, type CallOutcome } from "../helpers/tools";
import * as fx from "../fixtures/stages";

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  await seedLinkTargets(t.exec, linkTargetSeeds());
});
afterEach(() => t.close());

const ok = (o: CallOutcome) => {
  if (!o.ok) throw new Error(`Expected success, got ${JSON.stringify(o.error)}`);
  return o.data;
};
const fail = (o: CallOutcome) => {
  if (o.ok) throw new Error(`Expected an error, got ${JSON.stringify(o.data)}`);
  return o.error;
};

type Call = ReturnType<typeof toolCaller>;

async function startRun(call: Call, keyword = fx.KEYWORD) {
  ok(await call("enqueue_keywords", { items: [{ keyword }] }));
  return ok(await call("claim_next_keyword")).run_id as string;
}

async function throughQa(call: Call, runId: string, qa: object = fx.s9Pass) {
  const save = async (stage: string, output: object) => ok(await call("save_stage_output", { run_id: runId, stage, output }));
  await save("s1_keyword", fx.s1);
  ok(await call("check_cannibalization", { run_id: runId }));
  for (const [stage, output] of [["s3_brief", fx.s3], ["s4_research", fx.s4], ["s5_outline", fx.s5], ["s6_draft", fx.s6]] as const) await save(stage, output);
  const candidates = ok(await call("find_link_candidates", { run_id: runId }));
  await save("s8_links", fx.s8);
  expect(ok(await call("apply_internal_links", { run_id: runId })).links_inserted).toBe(3);
  await save("s7_seo", fx.s7);
  ok(await call("build_seo_package", { run_id: runId }));
  expect(ok(await call("check_originality", { run_id: runId }))).toMatchObject({ passed: true, next_stage: "s9_qa" });
  await save("s9_qa", qa);
  return candidates;
}

describe("Phase 3 tool sequence", () => {
  it("goes from draft to a pending_review article with verified, non-searchable index entries", async () => {
    const call = toolCaller(t);
    const runId = await startRun(call);
    const candidates = await throughQa(call, runId);

    const urls = (candidates.candidates as { url: string; type: string }[]).map((c) => c.url);
    expect(urls).toEqual(expect.arrayContaining(["/ecommerce-web-development", "/contact-us", "/portfolio"]));
    expect(candidates.link_rules).toMatchObject({ word_count: 742, min_links: 3, max_links: 3, existing_internal_links: 0 });
    expect(candidates.retrieval).toBe("lexical");

    const validation = ok(await call("validate_article", { run_id: runId }));
    expect(validation.errors).toEqual([]);
    expect(validation).toMatchObject({ passed: true, next_stage: "index_article" });

    const index = ok(await call("index_article", { run_id: runId }));
    expect(index).toMatchObject({ chunk_count: 8, verified: true, embedded: false, next_stage: "create_draft" });

    const draft = ok(await call("create_draft", { run_id: runId }));
    expect(draft).toMatchObject({ slug: "website-cost-in-nigeria", status: "pending_review", links_inserted: 3, chunks_stored: 8, word_count: 742 });
    expect(draft.review_url).toBe(`https://johnnybits.com/admin/blog-agent/drafts/${draft.article_id}`);

    const [article] = await t.exec.query<Record<string, unknown>>(
      "SELECT a.*, au.name AS author FROM articles a LEFT JOIN authors au ON au.id = a.author_id WHERE a.id = $1",
      [draft.article_id],
    );
    expect(article).toMatchObject({
      status: "pending_review", content_format: "markdown", author: "Odoh John", primary_keyword: fx.s1.primary_keyword,
      meta_title: fx.s7.meta_title, category: "Web Design", featured_image_alt: fx.s7.image_alt, run_id: runId, published_at: null,
    });
    expect(article.content).toContain("[ecommerce website](/ecommerce-web-development)");
    expect((article.citations as { id: string }[]).map((c) => c.id)).toEqual(["r1", "r2", "r3", "r4"]);
    expect((article.qa_report as { qa: { verdict: string } }).qa.verdict).toBe("PASS");

    const chunks = await t.exec.query<{ n: number; searchable: number }>(
      "SELECT count(*)::int AS n, count(*) FILTER (WHERE searchable)::int AS searchable FROM article_chunks WHERE article_id = $1",
      [draft.article_id],
    );
    expect(chunks[0]).toEqual({ n: 8, searchable: 0 });

    const [run] = await t.exec.query<{ status: string; article_id: string }>("SELECT status, article_id FROM pipeline_runs WHERE id = $1", [runId]);
    expect(run).toEqual({ status: "draft_created", article_id: draft.article_id });
    const [kw] = await t.exec.query<{ status: string }>("SELECT status FROM keyword_queue");
    expect(kw.status).toBe("done");
    const audit = await t.exec.query<{ action: string }>("SELECT action FROM audit_log WHERE entity_id = $1", [draft.article_id]);
    expect(audit.map((a) => a.action)).toEqual(["article.draft_created"]);

    // Not public: drafts never appear in site search or as link candidates.
    expect((await searchSiteContent(t.db, "website cost in Nigeria")).map((h) => h.url)).not.toContain("/blog/website-cost-in-nigeria");
    expect(fail(await call("create_draft", { run_id: runId })).code).toBe("invalid_state");
  });

  it("refuses to skip steps and reports what to do next", async () => {
    const call = toolCaller(t);
    const runId = await startRun(call);
    expect(fail(await call("create_draft", { run_id: runId })).message).toMatch(/s6_draft has not been saved|QA/);
    await throughQa(call, runId);
    expect(fail(await call("index_article", { run_id: runId })).hint).toBe("Call validate_article");
    expect(fail(await call("create_draft", { run_id: runId })).hint).toBe("Call validate_article");
    expect((ok(await call("get_run", { run_id: runId })) as { next_stage: string }).next_stage).toBe("validate_article");
  });

  it("invalidates links, package, QA and validation when the draft changes", async () => {
    const call = toolCaller(t);
    const runId = await startRun(call);
    await throughQa(call, runId);
    ok(await call("validate_article", { run_id: runId }));
    ok(await call("save_stage_output", { run_id: runId, stage: "s6_draft", output: { ...fx.s6, markdown: fx.s6.markdown.replace("Launch in phases.", "Launch in stages.") } }));

    expect(ok(await call("get_run", { run_id: runId })).next_stage).toBe("s8_links");
    expect(fail(await call("apply_internal_links", { run_id: runId })).message).toMatch(/older draft/);
    expect(fail(await call("validate_article", { run_id: runId })).hint).toBe("Call apply_internal_links again");
    expect(fail(await call("create_draft", { run_id: runId })).message).toMatch(/QA has not reviewed the current draft/);
  });

  it("does not create a draft when QA failed, even if validation passed", async () => {
    const call = toolCaller(t);
    const runId = await startRun(call);
    await throughQa(call, runId, fx.s9Fail);
    expect(ok(await call("validate_article", { run_id: runId })).next_stage).toBe("revise_draft_after_qa");
    expect(fail(await call("create_draft", { run_id: runId })).message).toBe("Editorial QA did not pass");
  });

  it("reports validation failures without blocking a fix, and refuses to index until they pass", async () => {
    const call = toolCaller(t);
    const runId = await startRun(call);
    await throughQa(call, runId);
    // Change the SEO FAQ so it no longer matches the article, then rebuild the package.
    ok(await call("save_stage_output", { run_id: runId, stage: "s7_seo", output: { ...fx.s7, faq: [{ ...fx.s7.faq[0], answer: "Something else entirely." }, fx.s7.faq[1]] } }));
    ok(await call("build_seo_package", { run_id: runId }));
    const report = ok(await call("validate_article", { run_id: runId }));
    expect(report.passed).toBe(false);
    expect((report.errors as { message: string }[])[0].message).toMatch(/FAQ answer .* differs/);
    expect(report.next_stage).toBe("revise_and_validate_again");
    expect(fail(await call("index_article", { run_id: runId })).message).toBe("Validation has not passed");
  });

  it("picks a free slug and warns when the suggestion is taken", async () => {
    await t.exec.query("INSERT INTO articles (title, slug) VALUES ('Old', 'website-cost-in-nigeria')");
    const call = toolCaller(t);
    const runId = await startRun(call);
    await throughQa(call, runId);
    const run = ok(await call("get_run", { run_id: runId })) as { stages: Record<string, { output: { slug: string; warnings: { message: string }[] } }> };
    expect(run.stages.s7_package.output.slug).toBe("website-cost-in-nigeria-2");
    expect(run.stages.s7_package.output.warnings.some((w) => /is taken/.test(w.message))).toBe(true);
  });

  it("blocks a second run on a keyword that already has a draft awaiting review", async () => {
    const call = toolCaller(t);
    const runId = await startRun(call);
    await throughQa(call, runId);
    ok(await call("validate_article", { run_id: runId }));
    ok(await call("index_article", { run_id: runId }));
    ok(await call("create_draft", { run_id: runId }));

    const other = toolCaller(t, "second-session");
    const second = ok(await other("create_run", { keyword: "website cost in nigeria 2026" })).run_id as string;
    ok(await other("save_stage_output", { run_id: second, stage: "s1_keyword", output: fx.s1 }));
    const check = ok(await other("check_cannibalization", { run_id: second }));
    expect(check).toMatchObject({ verdict: "block", sibling_conflict: false });
    expect((check.matches as { url: string; status: string }[])[0]).toMatchObject({ url: "/blog/website-cost-in-nigeria", status: "pending_review" });
  });

  it("hybrid mode embeds the index and only published, searchable vectors are retrievable", async () => {
    const call = toolCaller(t, "hybrid-client", { hybrid: true });
    const runId = await startRun(call);
    const candidates = await throughQa(call, runId);
    expect(candidates.retrieval).toBe("hybrid");
    ok(await call("validate_article", { run_id: runId }));
    expect(ok(await call("index_article", { run_id: runId }))).toMatchObject({ embedded: true, embedding_model: "fixture-bow-64" });
    const draft = ok(await call("create_draft", { run_id: runId }));

    const [dims] = await t.exec.query<{ dims: number; n: number }>(
      "SELECT min(embedding_dims)::int AS dims, count(embedding)::int AS n FROM article_chunks WHERE article_id = $1",
      [draft.article_id],
    );
    expect(dims).toEqual({ dims: 64, n: 8 });

    const provider = createFixtureProvider(64);
    const [query] = (await provider.embed(["website cost in Nigeria hosting maintenance"], "query")).vectors;
    expect((await vectorSearch(t.db, query, provider.model)).map((h) => h.url)).not.toContain("/blog/website-cost-in-nigeria");

    // Simulate the Phase 4 publish step.
    await t.exec.query("UPDATE articles SET status = 'published', published_at = now() WHERE id = $1", [draft.article_id]);
    await t.exec.query("UPDATE article_chunks SET searchable = true WHERE article_id = $1", [draft.article_id]);
    const hits = await vectorSearch(t.db, query, provider.model);
    expect(hits[0]).toMatchObject({ url: "/blog/website-cost-in-nigeria", kind: "article" });
    expect(hits[0].score).toBeGreaterThan(0);
    const [cost] = await t.exec.query<{ cost: string }>("SELECT embedding_cost_usd::text AS cost FROM pipeline_runs WHERE id = $1", [runId]);
    expect(Number(cost.cost)).toBe(0); // fixture provider is free
  });
});
