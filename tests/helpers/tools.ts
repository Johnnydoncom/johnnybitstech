import type { AuthInfo } from "@modelcontextprotocol/server";
import { createFixtureProvider } from "@/lib/blog-agent/embeddings/fixture";
import type { EmbeddingsProvider } from "@/lib/blog-agent/embeddings/types";
import { parseAgentEnv } from "@/lib/blog-agent/env";
import type { SourceFetcher } from "@/lib/blog-agent/qa/source-fetch";
import { invokeTool } from "@/lib/blog-agent/mcp/server";
import { BLOG_AGENT_TOOLS } from "@/lib/blog-agent/tools";
import type { TestDb } from "./db";

export type CallOutcome = { ok: true; data: Record<string, unknown> } | { ok: false; error: { code: string; message: string; hint?: string; details?: { issues?: { path: string; message: string }[] } } };

/** Calls a tool exactly as the MCP server does (rate limit, validation, logging), without HTTP. */
export type CallerOptions = { hybrid?: boolean; fetchSource?: SourceFetcher };

/** Tests never touch the network: by default every research source reads as an unrelated page. */
export const offlineSources: SourceFetcher = async (url) => ({
  ok: true,
  url,
  text: "This stand-in source page talks about unrelated matters such as gardening, weather patterns, river fishing and local football results in some detail.",
});

export function toolDeps(t: TestDb, options: CallerOptions = {}) {
  const agentEnv = parseAgentEnv(options.hybrid ? { RETRIEVAL_MODE: "hybrid", EMBEDDINGS_PROVIDER: "fixture" } : {});
  const embeddings: EmbeddingsProvider | null = options.hybrid ? createFixtureProvider(64) : null;
  return { getDb: () => t.db, siteOrigin: "https://johnnybits.com", rateLimitPerMinute: 1000, agentEnv, embeddings, fetchSource: options.fetchSource ?? offlineSources };
}

export function toolCaller(t: TestDb, clientId = "test-client", options: CallerOptions = {}) {
  const deps = toolDeps(t, options);
  const auth: AuthInfo = { token: "t", clientId, scopes: ["blog_agent"], extra: { grantId: null } };
  return async (name: string, args: Record<string, unknown> = {}): Promise<CallOutcome> => {
    const tool = BLOG_AGENT_TOOLS.find((x) => x.name === name);
    if (!tool) throw new Error(`No tool ${name}`);
    const result = await invokeTool(tool, args, auth, deps);
    if (result.isError) return { ok: false, error: JSON.parse((result.content[0] as { text: string }).text).error };
    return { ok: true, data: result.structuredContent as Record<string, unknown> };
  };
}
