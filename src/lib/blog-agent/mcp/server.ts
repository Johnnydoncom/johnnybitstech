import { sql } from "drizzle-orm";
import type { AuthInfo, CallToolResult, McpServer } from "@modelcontextprotocol/server";
import type { Db } from "@/db/types";
import type { EmbeddingsProvider } from "../embeddings/types";
import type { AgentEnv } from "../env";
import type { SourceFetcher } from "../qa/source-fetch";
import { rateLimit } from "@/lib/rate-limit";
import { BLOG_AGENT_TOOLS } from "../tools";
import { ToolError, type ToolContext, type ToolDefinition } from "../tools/types";

export const SERVER_INFO = { name: "johnnybits-blog-agent", version: "1.0.0" } as const;

export const SERVER_INSTRUCTIONS = [
  "Johnnybits Blog Agent connector. You produce exactly one article draft per session for human review; you cannot publish.",
  "Start with get_brand_context, then claim_next_keyword. Save every stage with save_stage_output before moving on;",
  "get_run and every save report next_stage, the next stage or tool to call.",
  "Link only to URLs returned by search_site_content or get_brand_context. Never invent statistics, quotes, clients or results.",
  "If a tool returns validation_failed, fix every listed issue and retry at most twice; if you stop for any reason, call report_failure.",
].join("\n");

export type ServerDeps = {
  getDb: () => Db;
  siteOrigin: string;
  rateLimitPerMinute: number;
  agentEnv: AgentEnv;
  embeddings: EmbeddingsProvider | null;
  fetchSource?: SourceFetcher;
};

type ErrorPayload = { error: { code: string; message: string; hint?: string; details?: unknown } };

function errorResult(payload: ErrorPayload): CallToolResult {
  return { isError: true, content: [{ type: "text", text: JSON.stringify(payload) }] };
}

/** Runs one tool call with rate limiting, output validation, structured errors and a call-log row. */
export async function invokeTool(tool: ToolDefinition, args: unknown, auth: AuthInfo | undefined, deps: ServerDeps): Promise<CallToolResult> {
  const started = Date.now();
  const db = deps.getDb();
  const clientId = auth?.clientId ?? "anonymous";
  const grantId = typeof auth?.extra?.grantId === "string" ? auth.extra.grantId : null;
  const runId = typeof (args as { run_id?: unknown })?.run_id === "string" ? (args as { run_id: string }).run_id : null;
  let ok = false;
  let errorCode: string | null = null;
  let loggedRunId = runId;

  try {
    const limit = await rateLimit(db, `mcp:${clientId}`, deps.rateLimitPerMinute);
    if (!limit.allowed) {
      throw new ToolError("rate_limited", `Rate limit of ${limit.limit} calls per minute reached`, `Wait until ${limit.resetAt.toISOString()} and retry`);
    }
    const ctx: ToolContext = { db, clientId, grantId, siteOrigin: deps.siteOrigin, agentEnv: deps.agentEnv, embeddings: deps.embeddings, fetchSource: deps.fetchSource };
    const input = tool.input.parse(args ?? {});
    const output = tool.output.parse(await tool.run(ctx, input)) as Record<string, unknown>;
    ok = true;
    if (!loggedRunId && typeof output.run_id === "string") loggedRunId = output.run_id;
    return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
  } catch (error) {
    const known =
      error instanceof ToolError
        ? error
        : error instanceof Error && error.name === "ZodError"
          ? new ToolError("validation_failed", "Invalid tool arguments", "Check the tool's input schema", { message: error.message })
          : null;
    if (!known) {
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
      console.error(JSON.stringify({ evt: "mcp_tool_error", tool: tool.name, client: clientId, run_id: runId, error: error instanceof Error ? error.message.split("\n")[0] : String(error), cause }));
    }
    const e = known ?? new ToolError("internal", "Unexpected server error", "Retry once; if it fails again, call report_failure");
    errorCode = e.code;
    return errorResult({ error: { code: e.code, message: e.message, hint: e.hint, details: e.details } });
  } finally {
    const durationMs = Date.now() - started;
    console.log(JSON.stringify({ evt: "mcp_tool", tool: tool.name, client: clientId, run_id: loggedRunId, ok, error: errorCode, ms: durationMs }));
    await db
      .execute(sql`
        INSERT INTO mcp_call_log (client_id, grant_id, tool, run_id, ok, error_code, duration_ms)
        VALUES (${clientId}, ${grantId}, ${tool.name}, ${loggedRunId}, ${ok}, ${errorCode}, ${durationMs})
      `)
      .catch((logError: unknown) => console.error("mcp_call_log insert failed", logError));
  }
}

export function registerBlogAgentTools(server: McpServer, deps: ServerDeps) {
  for (const tool of BLOG_AGENT_TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        outputSchema: tool.output,
        annotations: { title: tool.title, ...tool.annotations },
      },
      // Arguments are re-parsed in invokeTool so defaults and refinements always apply.
      async (args: unknown, ctx) => invokeTool(tool, args, ctx.http?.authInfo, deps),
    );
  }
}
