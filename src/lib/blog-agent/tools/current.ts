import { assertRunning, latestStages, loadRun, requireStage, savedAt, type StageMap } from "./run-store";
import { ToolError, type ToolContext } from "./types";

/** s8_applied output: the draft with internal links inserted. */
export type Applied = { title: string; markdown: string; applied: { url: string; anchor_text: string; offset: number }[]; source_draft_hash: string; links_version: number };

export async function loadRunning(ctx: ToolContext, runId: string) {
  const run = await loadRun(ctx.db, runId);
  assertRunning(run);
  return { run, saved: await latestStages(ctx.db, run.id) };
}

/** The linked draft, only if it was built from the latest draft and latest link picks. */
export function currentApplied(saved: StageMap) {
  const draft = requireStage(saved, "s6_draft", "Save the draft first");
  const links = saved.get("s8_links");
  const applied = saved.get("s8_applied");
  if (!applied || !links) throw new ToolError("invalid_state", "Internal links have not been applied", "Save s8_links, then call apply_internal_links");
  if ((applied.output as Applied).source_draft_hash !== draft.content_hash || savedAt(applied) < savedAt(links)) {
    throw new ToolError("invalid_state", "The draft or link picks changed after links were applied", "Call apply_internal_links again");
  }
  return applied;
}

/** The originality report for the current linked article; throws unless it exists and passed. */
export function currentOriginality(saved: StageMap, applied: { content_hash: string | null }) {
  const report = saved.get("s9_originality");
  if (!report || report.content_hash !== applied.content_hash) {
    throw new ToolError("invalid_state", "The originality of the current article has not been checked", "Call check_originality");
  }
  if (report.output.passed !== true) {
    throw new ToolError("invalid_state", "The originality check did not pass", "Rewrite the flagged passages in your own words (s6_draft), redo the later steps and call check_originality again");
  }
  return report;
}
