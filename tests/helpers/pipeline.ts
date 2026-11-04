import { expect } from "vitest";
import type { TestDb } from "./db";
import { toolCaller, type CallOutcome } from "./tools";
import * as fx from "../fixtures/stages";

export const ok = (o: CallOutcome) => {
  if (!o.ok) throw new Error(`Expected success, got ${JSON.stringify(o.error)}`);
  return o.data;
};

export type Call = (name: string, args?: Record<string, unknown>) => Promise<CallOutcome>;

/** Runs the whole agent pipeline with fixtures through `call` and returns the pending_review article. */
export async function runPipeline(call: Call) {
  ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD }] }));
  const runId = ok(await call("claim_next_keyword")).run_id as string;
  const save = async (stage: string, output: object) => ok(await call("save_stage_output", { run_id: runId, stage, output }));
  await save("s1_keyword", fx.s1);
  ok(await call("check_cannibalization", { run_id: runId }));
  for (const [stage, output] of [["s3_brief", fx.s3], ["s4_research", fx.s4], ["s5_outline", fx.s5], ["s6_draft", fx.s6]] as const) await save(stage, output);
  ok(await call("find_link_candidates", { run_id: runId }));
  await save("s8_links", fx.s8);
  ok(await call("apply_internal_links", { run_id: runId }));
  await save("s7_seo", fx.s7);
  ok(await call("build_seo_package", { run_id: runId }));
  expect(ok(await call("check_originality", { run_id: runId })).passed).toBe(true);
  await save("s9_qa", fx.s9Pass);
  expect(ok(await call("validate_article", { run_id: runId })).passed).toBe(true);
  const index = ok(await call("index_article", { run_id: runId }));
  const draft = ok(await call("create_draft", { run_id: runId }));
  return { articleId: draft.article_id as string, runId, slug: draft.slug as string, index };
}

/** Runs the whole agent pipeline in-process (no HTTP) and returns the pending_review article id. */
export async function createDraftViaTools(t: TestDb, clientId = "pipeline") {
  return runPipeline(toolCaller(t, clientId));
}
