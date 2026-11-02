import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, type TestDb } from "../helpers/db";
import { toolCaller, type CallOutcome } from "../helpers/tools";
import * as fx from "../fixtures/stages";

let t: TestDb;
let call: ReturnType<typeof toolCaller>;

beforeEach(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  await seedLinkTargets(t.exec, linkTargetSeeds());
  call = toolCaller(t);
});
afterEach(() => t.close());

function data(outcome: CallOutcome) {
  if (!outcome.ok) throw new Error(`Expected success, got ${JSON.stringify(outcome.error)}`);
  return outcome.data;
}
function err(outcome: CallOutcome) {
  if (outcome.ok) throw new Error(`Expected an error, got ${JSON.stringify(outcome.data)}`);
  return outcome.error;
}

async function startRun() {
  data(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD, priority: 70 }] }));
  const claim = data(await call("claim_next_keyword"));
  return claim.run_id as string;
}

async function saveThroughDraft(runId: string) {
  data(await call("save_stage_output", { run_id: runId, stage: "s1_keyword", output: fx.s1 }));
  expect(data(await call("check_cannibalization", { run_id: runId })).verdict).toBe("ok");
  for (const [stage, output] of [["s3_brief", fx.s3], ["s4_research", fx.s4], ["s5_outline", fx.s5], ["s6_draft", fx.s6]] as const) {
    data(await call("save_stage_output", { run_id: runId, stage, output }));
  }
}

describe("full tool sequence (fixtures, no network)", () => {
  it("runs brand → claim → s1 → cannibalization → s3…s9 and reports the next step", async () => {
    const brand = data(await call("get_brand_context"));
    expect((brand.company as { name: string }).name).toBe("Johnnybits Technology");

    const runId = await startRun();
    await saveThroughDraft(runId);
    const links = data(await call("save_stage_output", { run_id: runId, stage: "s8_links", output: fx.s8 }));
    expect(links.next_stage).toBe("s7_seo");
    data(await call("save_stage_output", { run_id: runId, stage: "s7_seo", output: fx.s7 }));
    const qa = data(await call("save_stage_output", { run_id: runId, stage: "s9_qa", output: fx.s9Pass }));
    expect(qa.next_stage).toBe("index_and_create_draft");

    const run = data(await call("get_run", { run_id: runId }));
    const stages = run.stages as Record<string, { version: number; content_hash: string }>;
    expect(Object.keys(stages).sort()).toEqual(["s1_keyword", "s3_brief", "s4_research", "s5_outline", "s6_draft", "s7_seo", "s8_links", "s9_qa"]);
    expect(stages.s9_qa.content_hash).toBe(stages.s6_draft.content_hash); // QA bound to the exact draft
    expect(run.stale_stages).toEqual([]);
    expect((run.run as { admin_url: string }).admin_url).toBe(`https://johnnybits.com/admin/blog-agent/runs/${runId}`);

    const logged = await t.exec.query<{ n: number }>("SELECT count(*)::int AS n FROM mcp_call_log WHERE run_id = $1", [runId]);
    expect(logged[0].n).toBeGreaterThanOrEqual(10);
  });

  it("versions re-saved stages and marks later stages stale", async () => {
    const runId = await startRun();
    await saveThroughDraft(runId);
    data(await call("save_stage_output", { run_id: runId, stage: "s8_links", output: fx.s8 }));
    const revised = data(await call("save_stage_output", { run_id: runId, stage: "s6_draft", output: { ...fx.s6, title: `${fx.s6.title} (2026)` } }));
    expect(revised.version).toBe(2);
    const run = data(await call("get_run", { run_id: runId }));
    expect(run.stale_stages).toEqual(["s8_links"]);
  });

  it("validate_only checks without saving", async () => {
    const runId = await startRun();
    const res = data(await call("save_stage_output", { run_id: runId, stage: "s1_keyword", output: fx.s1, validate_only: true }));
    expect(res.saved).toBe(false);
    expect(Object.keys(data(await call("get_run", { run_id: runId })).stages as object)).toEqual([]);
  });
});

describe("queue", () => {
  it("claims by priority, resumes the open run, and reports an empty queue", async () => {
    data(await call("enqueue_keywords", { items: [{ keyword: "low", priority: 10 }, { keyword: "high one", priority: 80 }] }));
    const first = data(await call("claim_next_keyword"));
    expect(first).toMatchObject({ status: "claimed", keyword: { keyword: "high one" } });
    expect(data(await call("claim_next_keyword"))).toMatchObject({ status: "resumed", run_id: first.run_id });

    const other = toolCaller(t, "another-client");
    expect(data(await other("claim_next_keyword"))).toMatchObject({ status: "claimed", keyword: { keyword: "low" } });
    expect(data(await toolCaller(t, "third")("claim_next_keyword"))).toMatchObject({ status: "empty" });
  });

  it("never hands the same keyword to two concurrent sessions", async () => {
    data(await call("enqueue_keywords", { items: ["a1", "a2", "a3"].map((keyword) => ({ keyword })) }));
    const results = await Promise.all(["c1", "c2", "c3"].map((c) => toolCaller(t, c)("claim_next_keyword")));
    const keywords = results.map((r) => (data(r).keyword as { keyword: string }).keyword);
    expect(new Set(keywords).size).toBe(3);
  });

  it("normalises and de-duplicates keywords and caps agent priority", async () => {
    const res = data(await call("enqueue_keywords", { items: [{ keyword: "Web Design, Lagos!" }, { keyword: "web design lagos" }] }));
    expect((res.added as unknown[]).length).toBe(1);
    expect(res.skipped).toEqual([{ keyword: "web design lagos", reason: "duplicate in this request" }]);
    expect(err(await call("enqueue_keywords", { items: [{ keyword: "x keyword", priority: 95 }] })).code).toBe("validation_failed");
  });

  it("releases runs that went silent so their keyword is written again", async () => {
    const runId = await startRun();
    await t.exec.query("UPDATE pipeline_runs SET heartbeat_at = now() - interval '7 hours' WHERE id = $1", [runId]);
    const next = data(await toolCaller(t, "fresh")("claim_next_keyword"));
    expect(next).toMatchObject({ status: "claimed", keyword: { keyword: fx.KEYWORD } });
    const [old] = await t.exec.query<{ status: string }>("SELECT status FROM pipeline_runs WHERE id = $1", [runId]);
    expect(old.status).toBe("abandoned");
  });

  it("saves a cluster plan and links queued keywords to it", async () => {
    const res = data(await call("save_cluster_plan", {
      clusters: [{ name: "Website costs", pillar_keyword: "website cost nigeria", priority: 60, children: [{ keyword: "ecommerce website cost" }] }],
    }));
    expect((res.keywords as { added: unknown[] }).added).toHaveLength(2);
    const rows = await t.exec.query<{ n: number }>("SELECT count(*)::int AS n FROM keyword_queue WHERE cluster_id IS NOT NULL");
    expect(rows[0].n).toBe(2);
    data(await call("save_cluster_plan", { clusters: [{ name: "Website costs v2", pillar_keyword: "Website Cost Nigeria", children: [] }] }));
    const clusters = await t.exec.query<{ name: string }>("SELECT name FROM content_clusters");
    expect(clusters).toEqual([{ name: "Website costs v2" }]);
  });

  it("create_run refuses a keyword that is already being written", async () => {
    await startRun();
    expect(err(await toolCaller(t, "x")("create_run", { keyword: fx.KEYWORD })).code).toBe("conflict");
    expect(data(await toolCaller(t, "y")("create_run", { keyword: "a brand new keyword" })).status).toBe("claimed");
  });
});

describe("gates and validation", () => {
  it("enforces stage order and the cannibalization check before the brief", async () => {
    const runId = await startRun();
    expect(err(await call("save_stage_output", { run_id: runId, stage: "s3_brief", output: fx.s3 })).message).toMatch(/s1_keyword/);
    data(await call("save_stage_output", { run_id: runId, stage: "s1_keyword", output: fx.s1 }));
    expect(err(await call("save_stage_output", { run_id: runId, stage: "s3_brief", output: fx.s3 })).message).toMatch(/check_cannibalization/);
  });

  it("blocks a keyword already covered by a published article", async () => {
    await t.exec.query(
      `INSERT INTO articles (title, slug, primary_keyword, status, published_at, content, content_format)
       VALUES ('Website Cost in Nigeria', 'website-cost-nigeria', 'Website cost in Nigeria!', 'published', now(), 'Prices', 'markdown')`,
    );
    const runId = await startRun();
    data(await call("save_stage_output", { run_id: runId, stage: "s1_keyword", output: fx.s1 }));
    const check = data(await call("check_cannibalization", { run_id: runId }));
    expect(check.verdict).toBe("block");
    expect((check.matches as { url: string }[])[0].url).toBe("/blog/website-cost-nigeria");
    expect(err(await call("save_stage_output", { run_id: runId, stage: "s3_brief", output: fx.s3 })).hint).toMatch(/report_failure/);
  });

  it("asks for review when a similar article exists", async () => {
    await t.exec.query(
      `INSERT INTO articles (title, slug, primary_keyword, status, published_at, content, content_format)
       VALUES ('Website Design Price in Nigeria Explained', 'website-design-price-nigeria', 'website design price nigeria', 'published', now(), 'website cost nigeria price design', 'markdown')`,
    );
    const runId = await startRun();
    data(await call("save_stage_output", { run_id: runId, stage: "s1_keyword", output: fx.s1 }));
    expect(data(await call("check_cannibalization", { run_id: runId })).verdict).toBe("review");
  });

  it("returns every schema issue with its path", async () => {
    const runId = await startRun();
    const e = err(await call("save_stage_output", { run_id: runId, stage: "s1_keyword", output: { ...fx.s1, target_word_count: 100, search_intent: "curious" } }));
    expect(e.code).toBe("validation_failed");
    expect(e.details?.issues?.map((i) => i.path).sort()).toEqual(["search_intent", "target_word_count"]);
  });

  it("rejects links and CTAs that are not real site pages", async () => {
    const runId = await startRun();
    data(await call("save_stage_output", { run_id: runId, stage: "s1_keyword", output: fx.s1 }));
    data(await call("check_cannibalization", { run_id: runId }));
    const bad = { ...fx.s3, internal_link_targets: [{ url: "/services/web-design", reason: "x" }], cta: { label: "Call", url: "https://evil.example/" } };
    const issues = err(await call("save_stage_output", { run_id: runId, stage: "s3_brief", output: bad })).details?.issues ?? [];
    expect(issues.map((i) => i.path).sort()).toEqual(["cta.url", "internal_link_targets.0.url"]);
  });

  it("requires every citation to map to research and link to its exact source", async () => {
    const runId = await startRun();
    await saveThroughDraft(runId);
    const wrongSource = fx.s6.markdown.replace("(https://example.org/hosting-plans)", "(https://example.org/other)");
    const unknownId = fx.s6.markdown.replace("[^r4] ", "[^r9] ");
    const e1 = err(await call("save_stage_output", { run_id: runId, stage: "s6_draft", output: { ...fx.s6, markdown: wrongSource } }));
    expect(e1.details?.issues?.[0].message).toMatch(/\[\^r2\] must link to its research source/);
    const e2 = err(await call("save_stage_output", { run_id: runId, stage: "s6_draft", output: { ...fx.s6, markdown: unknownId } }));
    expect(e2.details?.issues?.some((i) => /\[\^r9\]/.test(i.message))).toBe(true);
    const e3 = err(await call("save_stage_output", { run_id: runId, stage: "s6_draft", output: { ...fx.s6, markdown: `# Title\n\n${fx.s6.markdown}` } }));
    expect(e3.details?.issues?.[0].message).toMatch(/H1/);
  });

  it("warns about unresolved [[NEEDS_SOURCE]] markers", async () => {
    const runId = await startRun();
    await saveThroughDraft(runId);
    const res = data(await call("save_stage_output", { run_id: runId, stage: "s6_draft", output: { ...fx.s6, markdown: `${fx.s6.markdown}\n\nPrices rose last year. [[NEEDS_SOURCE]]` } }));
    expect((res.warnings as { message: string }[]).some((w) => /NEEDS_SOURCE/.test(w.message))).toBe(true);
  });

  it("checks link sentences and anchors against the draft", async () => {
    const runId = await startRun();
    await saveThroughDraft(runId);
    const bad = { links: [{ ...fx.s8.links[0], sentence: "A sentence that is not in the draft at all.", anchor_text: "click here" }] };
    const issues = err(await call("save_stage_output", { run_id: runId, stage: "s8_links", output: bad })).details?.issues ?? [];
    expect(issues.map((i) => i.path)).toEqual(expect.arrayContaining(["links.0.sentence", "links.0.anchor_text"]));
  });

  it("rejects an inconsistent QA verdict", async () => {
    const runId = await startRun();
    await saveThroughDraft(runId);
    data(await call("save_stage_output", { run_id: runId, stage: "s8_links", output: fx.s8 }));
    data(await call("save_stage_output", { run_id: runId, stage: "s7_seo", output: fx.s7 }));
    const passWithMajor = { ...fx.s9Fail, verdict: "PASS" };
    expect(err(await call("save_stage_output", { run_id: runId, stage: "s9_qa", output: passWithMajor })).code).toBe("validation_failed");
    expect(data(await call("save_stage_output", { run_id: runId, stage: "s9_qa", output: fx.s9Fail })).saved).toBe(true);
  });

  it("report_failure hands the run to a human and frees nothing else", async () => {
    const runId = await startRun();
    const res = data(await call("report_failure", { run_id: runId, stage: "s1_keyword", reason: "Already covered", recommendation: "Update /blog/x" }));
    expect(res.status).toBe("needs_human");
    expect(err(await call("save_stage_output", { run_id: runId, stage: "s1_keyword", output: fx.s1 })).code).toBe("invalid_state");
    const [kw] = await t.exec.query<{ status: string; notes: string }>("SELECT status, notes FROM keyword_queue");
    expect(kw.status).toBe("failed");
    expect(kw.notes).toContain("Already covered");
  });

  it("returns not_found for unknown runs and rate-limits per client", async () => {
    expect(err(await call("get_run", { run_id: "00000000-0000-4000-8000-000000000000" })).code).toBe("not_found");
    const { invokeTool } = await import("@/lib/blog-agent/mcp/server");
    const { BLOG_AGENT_TOOLS } = await import("@/lib/blog-agent/tools");
    const tool = BLOG_AGENT_TOOLS.find((x) => x.name === "get_brand_context")!;
    const deps = { getDb: () => t.db, siteOrigin: "https://johnnybits.com", rateLimitPerMinute: 2 };
    const auth = { token: "t", clientId: "limited", scopes: ["blog_agent"] };
    await invokeTool(tool, {}, auth, deps);
    await invokeTool(tool, {}, auth, deps);
    const third = await invokeTool(tool, {}, auth, deps);
    expect(third.isError).toBe(true);
    expect((third.content[0] as { text: string }).text).toContain("rate_limited");
  });
});
