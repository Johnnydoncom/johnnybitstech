import { z } from "zod";
import { EmbeddingsError, l2Normalize, type EmbeddingKind, type EmbeddingsProvider } from "./types";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_BATCH = 64;

type ProviderSpec = {
  id: "openai" | "voyage";
  url: string;
  apiKey: string;
  model: string;
  dims: number;
  usdPerMillionTokens: number;
  body(texts: readonly string[], kind: EmbeddingKind): Record<string, unknown>;
};

const responseSchema = z.object({
  data: z.array(z.object({ index: z.number().int(), embedding: z.array(z.number()) })),
  usage: z.object({ total_tokens: z.number().int() }).passthrough(),
});

function httpProvider(spec: ProviderSpec): EmbeddingsProvider {
  async function embedBatch(texts: readonly string[], kind: EmbeddingKind) {
    let response: Response;
    try {
      response = await fetch(spec.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${spec.apiKey}` },
        body: JSON.stringify(spec.body(texts, kind)),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      throw new EmbeddingsError(`${spec.id} embeddings request failed`, true, { cause: error });
    }
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new EmbeddingsError(`${spec.id} embeddings returned HTTP ${response.status}`, retryable);
    }
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new EmbeddingsError(`${spec.id} embeddings response had an unexpected shape`, false);

    const vectors = parsed.data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    if (vectors.length !== texts.length || vectors.some((v) => v.length !== spec.dims)) {
      throw new EmbeddingsError(`${spec.id} returned ${vectors.length} vectors of unexpected size (expected ${texts.length} × ${spec.dims})`, false);
    }
    return { vectors: vectors.map(l2Normalize), tokens: parsed.data.usage.total_tokens };
  }

  return {
    id: spec.id,
    model: spec.model,
    dims: spec.dims,
    async embed(texts, kind) {
      const vectors: number[][] = [];
      let tokens = 0;
      for (let i = 0; i < texts.length; i += MAX_BATCH) {
        const batch = await embedBatch(texts.slice(i, i + MAX_BATCH), kind);
        vectors.push(...batch.vectors);
        tokens += batch.tokens;
      }
      return { vectors, tokens, costUsd: (tokens / 1_000_000) * spec.usdPerMillionTokens };
    },
  };
}

export function createOpenAiProvider(opts: { apiKey: string; model?: string; dims?: number; usdPerMillionTokens?: number }) {
  const model = opts.model ?? "text-embedding-3-small";
  const dims = opts.dims ?? 1536;
  return httpProvider({
    id: "openai",
    url: "https://api.openai.com/v1/embeddings",
    apiKey: opts.apiKey,
    model,
    dims,
    // List price for text-embedding-3-small at the time of writing; override with EMBEDDINGS_USD_PER_MTOK.
    usdPerMillionTokens: opts.usdPerMillionTokens ?? 0.02,
    body: (texts) => ({ model, input: texts, dimensions: dims, encoding_format: "float" }),
  });
}

export function createVoyageProvider(opts: { apiKey: string; model?: string; dims?: number; usdPerMillionTokens?: number }) {
  const model = opts.model ?? "voyage-3.5";
  const dims = opts.dims ?? 1024;
  if (![256, 512, 1024, 2048].includes(dims)) {
    throw new EmbeddingsError(`Voyage supports 256, 512, 1024 or 2048 dimensions, not ${dims}`, false);
  }
  return httpProvider({
    id: "voyage",
    url: "https://api.voyageai.com/v1/embeddings",
    apiKey: opts.apiKey,
    model,
    dims,
    // Set EMBEDDINGS_USD_PER_MTOK from Voyage's current price list to get cost reporting.
    usdPerMillionTokens: opts.usdPerMillionTokens ?? 0,
    body: (texts, kind) => ({ model, input: texts, input_type: kind, output_dimension: dims }),
  });
}
