import { checkCannibalization } from "./cannibalization";
import { getBrandContextTool, searchSiteContentTool } from "./content";
import { claimNextKeyword, createRun, enqueueKeywords, saveClusterPlan } from "./queue";
import { getRun, reportFailure, saveStageOutput } from "./runs";
import type { ToolDefinition } from "./types";

/**
 * Every tool the connector exposes. There is deliberately no publish, approve, reject or delete tool:
 * those exist only as authenticated admin actions. tests/mcp/route.test.ts enforces this.
 */
export const BLOG_AGENT_TOOLS = [
  getBrandContextTool,
  searchSiteContentTool,
  enqueueKeywords,
  saveClusterPlan,
  claimNextKeyword,
  createRun,
  getRun,
  saveStageOutput,
  checkCannibalization,
  reportFailure,
] as unknown as ToolDefinition[];
