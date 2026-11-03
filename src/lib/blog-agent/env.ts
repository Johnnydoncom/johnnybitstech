import { z } from "zod";

const flag = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const envSchema = z
  .object({
    RETRIEVAL_MODE: z.enum(["lexical", "hybrid"]).default("lexical"),
    EMBEDDINGS_PROVIDER: z.enum(["none", "openai", "voyage", "fixture"]).default("none"),
    EMBEDDINGS_MODEL: z.string().min(1).optional(),
    EMBEDDINGS_DIMS: z.coerce.number().int().min(64).max(4096).optional(),
    /** Optional override of the provider's price in USD per million tokens (for cost reporting). */
    EMBEDDINGS_USD_PER_MTOK: z.coerce.number().min(0).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    VOYAGE_API_KEY: z.string().min(1).optional(),
    /** Hard ceiling on embedding spend per pipeline run; past it the run continues lexical-only. */
    AGENT_MAX_EMBEDDING_USD_PER_RUN: z.coerce.number().min(0).default(0.5),
    AGENT_DRY_RUN: flag,
    AGENT_FAQ_SCHEMA: flag,
  })
  .superRefine((env, ctx) => {
    if (env.RETRIEVAL_MODE === "hybrid" && env.EMBEDDINGS_PROVIDER === "none") {
      ctx.addIssue({ code: "custom", path: ["EMBEDDINGS_PROVIDER"], message: "RETRIEVAL_MODE=hybrid needs an embeddings provider" });
    }
    if (env.EMBEDDINGS_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["OPENAI_API_KEY"], message: "EMBEDDINGS_PROVIDER=openai needs OPENAI_API_KEY" });
    }
    if (env.EMBEDDINGS_PROVIDER === "voyage" && !env.VOYAGE_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["VOYAGE_API_KEY"], message: "EMBEDDINGS_PROVIDER=voyage needs VOYAGE_API_KEY" });
    }
  });

export type AgentEnv = z.infer<typeof envSchema>;

/** Parses agent-related env vars. Throws a readable error listing every misconfiguration. */
export function parseAgentEnv(source: Record<string, string | undefined> = process.env): AgentEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Blog agent configuration error: ${problems}`);
  }
  return result.data;
}
