import type { AuthInfo } from "@modelcontextprotocol/server";
import { invokeTool } from "@/lib/blog-agent/mcp/server";
import { BLOG_AGENT_TOOLS } from "@/lib/blog-agent/tools";
import type { TestDb } from "./db";

export type CallOutcome = { ok: true; data: Record<string, unknown> } | { ok: false; error: { code: string; message: string; hint?: string; details?: { issues?: { path: string; message: string }[] } } };

/** Calls a tool exactly as the MCP server does (rate limit, validation, logging), without HTTP. */
export function toolCaller(t: TestDb, clientId = "test-client") {
  const auth: AuthInfo = { token: "t", clientId, scopes: ["blog_agent"], extra: { grantId: null } };
  return async (name: string, args: Record<string, unknown> = {}): Promise<CallOutcome> => {
    const tool = BLOG_AGENT_TOOLS.find((x) => x.name === name);
    if (!tool) throw new Error(`No tool ${name}`);
    const result = await invokeTool(tool, args, auth, { getDb: () => t.db, siteOrigin: "https://johnnybits.com", rateLimitPerMinute: 1000 });
    if (result.isError) return { ok: false, error: JSON.parse((result.content[0] as { text: string }).text).error };
    return { ok: true, data: result.structuredContent as Record<string, unknown> };
  };
}
