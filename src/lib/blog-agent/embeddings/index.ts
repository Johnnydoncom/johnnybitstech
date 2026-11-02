import type { AgentEnv } from "../env";
import { createFixtureProvider } from "./fixture";
import { createOpenAiProvider, createVoyageProvider } from "./http";
import type { EmbeddingsProvider } from "./types";

export * from "./types";

/** Returns the configured provider, or null in lexical-only mode. AGENT_DRY_RUN forces the offline fixture. */
export function getEmbeddingsProvider(env: AgentEnv): EmbeddingsProvider | null {
  if (env.AGENT_DRY_RUN) return createFixtureProvider(env.EMBEDDINGS_DIMS ?? 256);
  switch (env.EMBEDDINGS_PROVIDER) {
    case "none":
      return null;
    case "fixture":
      return createFixtureProvider(env.EMBEDDINGS_DIMS ?? 256);
    case "openai":
      return createOpenAiProvider({
        apiKey: env.OPENAI_API_KEY!, // presence enforced by parseAgentEnv
        model: env.EMBEDDINGS_MODEL,
        dims: env.EMBEDDINGS_DIMS,
        usdPerMillionTokens: env.EMBEDDINGS_USD_PER_MTOK,
      });
    case "voyage":
      return createVoyageProvider({
        apiKey: env.VOYAGE_API_KEY!, // presence enforced by parseAgentEnv
        model: env.EMBEDDINGS_MODEL,
        dims: env.EMBEDDINGS_DIMS,
        usdPerMillionTokens: env.EMBEDDINGS_USD_PER_MTOK,
      });
  }
}
