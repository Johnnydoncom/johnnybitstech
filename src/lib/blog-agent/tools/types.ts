import type { z } from "zod";
import type { Db } from "@/db/types";
import type { EmbeddingsProvider } from "../embeddings/types";
import type { AgentEnv } from "../env";
import type { SourceFetcher } from "../qa/source-fetch";

export type ToolContext = {
  db: Db;
  /** OAuth client id (or "static-token"). Used to scope run resumption and rate limits. */
  clientId: string;
  grantId: string | null;
  /** Origin for admin links in tool output, e.g. https://johnnybits.com */
  siteOrigin: string;
  agentEnv: AgentEnv;
  /** Null in lexical-only mode (no embeddings key configured). */
  embeddings: EmbeddingsProvider | null;
  /** Reads research sources for check_originality; defaults to the SSRF-guarded fetcher. Tests inject a fake. */
  fetchSource?: SourceFetcher;
};

export type ToolErrorCode = "not_found" | "invalid_state" | "validation_failed" | "conflict" | "rate_limited" | "internal";

/** An expected failure Claude can act on. Returned as an MCP tool error with code, message and hint. */
export class ToolError extends Error {
  constructor(
    readonly code: ToolErrorCode,
    message: string,
    readonly hint?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export type ToolAnnotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export type ToolDefinition<I extends z.ZodObject = z.ZodObject, O extends z.ZodObject = z.ZodObject> = {
  name: string;
  title: string;
  description: string;
  input: I;
  output: O;
  annotations: ToolAnnotations;
  run(ctx: ToolContext, input: z.output<I>): Promise<z.input<O>>;
};

export function defineTool<I extends z.ZodObject, O extends z.ZodObject>(def: ToolDefinition<I, O>): ToolDefinition<I, O> {
  return def;
}

/** Lower-case, NFKC, punctuation collapsed: "Web Design, Lagos!" and "web design lagos" are one keyword. */
export function normalizeKeyword(keyword: string): string {
  return keyword
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#&\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function runAdminUrl(ctx: ToolContext, runId: string): string {
  return `${ctx.siteOrigin}/admin/blog-agent/runs/${runId}`;
}
