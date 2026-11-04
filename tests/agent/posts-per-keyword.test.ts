import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { addKeywords, listQueue, setPostsTarget } from "@/lib/blog-agent/admin/queue";
import { AdminError, rejectArticle } from "@/lib/blog-agent/admin/drafts";
import type { SourceFetcher } from "@/lib/blog-agent/qa/source-fetch";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, type TestDb } from "../helpers/db";
import { ok } from "../helpers/pipeline";
import { toolCaller, type CallOutcome } from "../helpers/tools";
import * as fx from "../fixtures/stages";

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  await seedLinkTargets(t.exec, linkTargetSeeds());
});
afterEach(() => t.close());

const fail = (o: CallOutcome) => {
  if (o.ok) throw new Error(`Expected an error, got ${JSON.stringify(o.data)}`);
  return o.error;
};
type Call = ReturnType<typeof toolCaller>;
type Post = { number: number; of: number; written: number; siblings: { url: string; primary_keyword: string; angle: string | null; h2s: string[] }[]; guidance: string };

/** Saves S1–S7 and builds the package: everything up to the originality check. */
async function toPackage(call: Call, runId: string, s1: object = fx.s1) {
  const save = async (stage: string, output: object) => ok(await call("save_stage_output", { run_id: runId, stage, output }));
  await save("s1_keyword", s1);
  const cannibalization = ok(await call("check_cannibalization", { run_id: runId }));
  if (cannibalization.verdict === "block") return { cannibalization, save };
  for (const [stage, output] of [["s3_brief", fx.s3], ["s4_research", fx.s4], ["s5_outline", fx.s5], ["s6_draft", fx.s6]] as const) await save(stage, output);
  ok(await call("find_link_candidates", { run_id: runId }));
  await save("s8_links", fx.s8);
  ok(await call("apply_internal_links", { run_id: runId }));
  await save("s7_seo", fx.s7);
  ok(await call("build_seo_package", { run_id: runId }));
  return { cannibalization, save };
}

async function finish(call: Call, runId: string, s1: object = fx.s1) {
  const { save } = await toPackage(call, runId, s1);
  expect(ok(await call("check_originality", { run_id: runId })).passed).toBe(true);
  await save("s9_qa", fx.s9Pass);
  expect(ok(await call("validate_article", { run_id: runId })).passed).toBe(true);
  ok(await call("index_article", { run_id: runId }));
  return ok(await call("create_draft", { run_id: runId }));
}

const keyword = async (text: string) =>
  (await t.exec.query<{ status: string; posts_target: number }>("SELECT status::text AS status, posts_target FROM keyword_queue WHERE keyword = $1", [text]))[0];

/**
 * Lets the same fixture article be written again for the second post: the first post's text and primary keyword are
 * replaced, as a genuinely different first post would have them.
 */
async function makeFirstPostDistinct(articleId: string) {
  await t.exec.query(
    "UPDATE articles SET primary_keyword = 'ecommerce platform fees', content = '## A different article\n\nEntirely different words about selling online, card fees and delivery partners.' WHERE id = $1",
    [articleId],
  );
}

describe("posts per keyword", () => {
  it("accepts a posts count when queueing, up to 20", async () => {
    const call = toolCaller(t);
    const added = ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD, posts: 3 }, { keyword: "ecommerce website cost nigeria" }] }));
    expect((added.added as { posts: number }[]).map((a) => a.posts)).toEqual([3, 1]);
    expect(await keyword(fx.KEYWORD)).toEqual({ status: "queued", posts_target: 3 });
    expect(fail(await call("enqueue_keywords", { items: [{ keyword: "too many posts", posts: 21 }] })).code).toBe("validation_failed");
  });

  it("re-queues the keyword after each post until its target, rotating with other keywords", async () => {
    const call = toolCaller(t);
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD, priority: 80, posts: 2 }, { keyword: "website maintenance cost nigeria", priority: 10 }] }));

    // Post 1 of 2: highest priority first.
    const first = ok(await call("claim_next_keyword"));
    expect(first.keyword).toMatchObject({ keyword: fx.KEYWORD });
    expect(first.post).toMatchObject({ number: 1, of: 2, written: 0, siblings: [] });
    const draft1 = await finish(call, first.run_id as string);
    expect(draft1.keyword).toEqual({ status: "queued", posts_written: 1, posts_target: 2 });
    expect(await keyword(fx.KEYWORD)).toMatchObject({ status: "queued" });

    // Rotation: the low-priority keyword with no posts yet goes before the second post of the first keyword.
    const second = ok(await call("claim_next_keyword"));
    expect(second.keyword).toMatchObject({ keyword: "website maintenance cost nigeria" });
    expect(second.post).toMatchObject({ number: 1, of: 1 });
    ok(await call("report_failure", { run_id: second.run_id, stage: "s1_keyword", reason: "Test: not writing this one", recommendation: "Skip it" }));

    // Post 2 of 2 sees post 1 as a sibling, with its angle and H2s.
    const third = ok(await call("claim_next_keyword"));
    expect(third.keyword).toMatchObject({ keyword: fx.KEYWORD });
    const post = third.post as Post;
    expect(post).toMatchObject({ number: 2, of: 2, written: 1 });
    expect(post.siblings).toHaveLength(1);
    expect(post.siblings[0]).toMatchObject({ url: `/blog/${draft1.slug}`, primary_keyword: fx.s1.primary_keyword, angle: fx.s3.angle });
    expect(post.siblings[0].h2s[0]).toBe("What drives website cost in Nigeria");
    expect(post.guidance).toMatch(/distinct long-tail primary keyword/);
    expect(third.message).toMatch(/post 2 of 2/);
    expect((ok(await call("get_run", { run_id: third.run_id })).post as Post).number).toBe(2);

    await makeFirstPostDistinct(draft1.article_id as string);
    const draft2 = await finish(call, third.run_id as string);
    expect(draft2.keyword).toEqual({ status: "done", posts_written: 2, posts_target: 2 });
    expect(await keyword(fx.KEYWORD)).toMatchObject({ status: "done" });
    expect(ok(await call("claim_next_keyword")).status).toBe("empty");
  });

  it("asks for a distinct long-tail keyword (not a failure) when a later post repeats an earlier post's keyword", async () => {
    const call = toolCaller(t);
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD, posts: 2 }] }));
    await finish(call, ok(await call("claim_next_keyword")).run_id as string);

    const runId = ok(await call("claim_next_keyword")).run_id as string;
    const { cannibalization, save } = await toPackage(call, runId);
    expect(cannibalization).toMatchObject({ verdict: "block", sibling_conflict: true });
    expect(cannibalization.guidance).toMatch(/Do not stop: choose a distinct long-tail primary keyword/);
    expect((cannibalization.matches as { sibling: boolean }[])[0].sibling).toBe(true);
    expect(fail(await call("save_stage_output", { run_id: runId, stage: "s3_brief", output: fx.s3 })).hint).toMatch(/distinct long-tail primary keyword/);

    // Near-identical keywords are caught too.
    await save("s1_keyword", { ...fx.s1, primary_keyword: "website costs in Nigeria" });
    expect(ok(await call("get_run", { run_id: runId })).next_stage).toBe("check_cannibalization"); // re-saving s1 clears the old check
    expect(ok(await call("check_cannibalization", { run_id: runId }))).toMatchObject({ verdict: "block", sibling_conflict: true });

    // A genuinely different long-tail keyword can proceed.
    await save("s1_keyword", { ...fx.s1, primary_keyword: "ecommerce website cost for Lagos fashion brands" });
    const check = ok(await call("check_cannibalization", { run_id: runId }));
    expect(check.verdict).not.toBe("block");
    expect(check.sibling_conflict).toBe(false);
  });

  it("blocks a draft that repeats an earlier post's text", async () => {
    const call = toolCaller(t);
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD, posts: 2 }] }));
    await finish(call, ok(await call("claim_next_keyword")).run_id as string);

    const runId = ok(await call("claim_next_keyword")).run_id as string;
    const s1 = { ...fx.s1, primary_keyword: "ecommerce website cost for Lagos fashion brands" };
    const { save } = await toPackage(call, runId, s1);
    const report = ok(await call("check_originality", { run_id: runId }));
    expect(report).toMatchObject({ passed: false, next_stage: "revise_for_originality" });
    expect((report.errors as { path: string; message: string }[])[0]).toMatchObject({ path: expect.stringMatching(/^internal:\/blog\//), message: expect.stringMatching(/Rewrite it/) });

    await save("s9_qa", fx.s9Pass);
    ok(await call("validate_article", { run_id: runId }));
    expect(fail(await call("index_article", { run_id: runId })).message).toBe("The originality check did not pass");
    expect(fail(await call("create_draft", { run_id: runId })).message).toBe("The originality check did not pass");
  });

  it("blocks text copied from a research source but allows quoting it", async () => {
    const copied = fx.s6.markdown.split("\n").find((l) => l.startsWith("Scope is the biggest driver"))!;
    const sources: SourceFetcher = async (url) => ({ ok: true, url, text: url.endsWith("/hosting-plans") ? `Industry overview. ${copied} More text.` : "Unrelated page text about gardening and the weather in some detail for padding purposes only." });
    const call = toolCaller(t, "copy-test", { fetchSource: sources });
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD }] }));
    const runId = ok(await call("claim_next_keyword")).run_id as string;
    await toPackage(call, runId);
    const report = ok(await call("check_originality", { run_id: runId }));
    expect(report.passed).toBe(false);
    expect((report.errors as { path: string }[]).map((e) => e.path)).toEqual(["source:https://example.org/hosting-plans"]);
    expect((report.sources as { checked: number }).checked).toBe(4);

    // The same sentence inside quotation marks is a quote, not plagiarism.
    const quoted = fx.s6.markdown.replace(copied, `One guide puts it plainly: "${copied}"`);
    ok(await call("save_stage_output", { run_id: runId, stage: "s6_draft", output: { ...fx.s6, markdown: quoted } }));
    ok(await call("save_stage_output", { run_id: runId, stage: "s8_links", output: fx.s8 }));
    ok(await call("apply_internal_links", { run_id: runId }));
    ok(await call("build_seo_package", { run_id: runId }));
    expect(ok(await call("check_originality", { run_id: runId })).passed).toBe(true);
  });

  it("warns, without failing, when sources cannot be fetched", async () => {
    const call = toolCaller(t, "offline", { fetchSource: async (url) => ({ ok: false, url, reason: "the page returned HTTP 403" }) });
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD }] }));
    const runId = ok(await call("claim_next_keyword")).run_id as string;
    await toPackage(call, runId);
    const report = ok(await call("check_originality", { run_id: runId }));
    expect(report).toMatchObject({ passed: true, next_stage: "s9_qa", sources: { checked: 0, not_checked: 4 } });
    expect((report.warnings as { message: string }[]).some((w) => /could not be checked automatically/.test(w.message))).toBe(true);
  });

  it("lets an admin set posts per keyword, re-opening or closing the keyword as needed", async () => {
    const r = await addKeywords(t.db, "website cost in lagos\nlanding page cost nigeria", 60, null, 3);
    expect(r.added).toBe(2);
    let rows = await listQueue(t.db);
    expect(rows.map((k) => [k.posts_target, k.posts_written])).toEqual([[3, 0], [3, 0]]);
    await expect(addKeywords(t.db, "another keyword", 50, null, 0)).rejects.toThrow(AdminError);
    await expect(setPostsTarget(t.db, rows[0].id, 21)).rejects.toThrow(/1 to 20/);

    // Write one post for a keyword set to 1, so it is done; raising the target re-queues it.
    const call = toolCaller(t);
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD, priority: 80 }] }));
    const draft = await finish(call, ok(await call("claim_next_keyword")).run_id as string);
    expect(draft.keyword).toEqual({ status: "done", posts_written: 1, posts_target: 1 });
    const id = (await listQueue(t.db)).find((k) => k.keyword === fx.KEYWORD)!.id;
    expect(await setPostsTarget(t.db, id, 2)).toEqual({ status: "queued", posts_written: 1 });
    expect(await setPostsTarget(t.db, id, 1)).toEqual({ status: "done", posts_written: 1 });

    // A rejected draft no longer counts as written.
    await setPostsTarget(t.db, id, 2);
    await rejectArticle(t.db, draft.article_id as string, "Off-brief angle", false);
    rows = await listQueue(t.db);
    expect(rows.find((k) => k.id === id)).toMatchObject({ posts_written: 0, posts_target: 2, status: "queued" });
  });

  it("does not release a keyword that another post is being written for when a draft is rejected", async () => {
    const call = toolCaller(t);
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD, posts: 2 }] }));
    const draft = await finish(call, ok(await call("claim_next_keyword")).run_id as string);
    const running = ok(await call("claim_next_keyword")).run_id as string;
    await rejectArticle(t.db, draft.article_id as string, "Rejected while post 2 runs", true);
    const [kw] = await t.exec.query<{ status: string; claimed_by_run: string }>("SELECT status::text AS status, claimed_by_run FROM keyword_queue");
    expect(kw).toEqual({ status: "claimed", claimed_by_run: running });
  });
});
