import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAgentEnv } from "@/lib/blog-agent/env";
import { cosineSimilarity, EmbeddingsError, getEmbeddingsProvider } from "@/lib/blog-agent/embeddings";
import { createFixtureProvider } from "@/lib/blog-agent/embeddings/fixture";
import { createOpenAiProvider, createVoyageProvider } from "@/lib/blog-agent/embeddings/http";

afterEach(() => vi.unstubAllGlobals());

describe("agent env", () => {
  it("defaults to lexical retrieval with no provider and no key", () => {
    const env = parseAgentEnv({});
    expect(env).toMatchObject({ RETRIEVAL_MODE: "lexical", EMBEDDINGS_PROVIDER: "none", AGENT_DRY_RUN: false });
    expect(getEmbeddingsProvider(env)).toBeNull();
  });

  it("explains misconfiguration", () => {
    expect(() => parseAgentEnv({ RETRIEVAL_MODE: "hybrid" })).toThrow(/needs an embeddings provider/);
    expect(() => parseAgentEnv({ EMBEDDINGS_PROVIDER: "openai" })).toThrow(/OPENAI_API_KEY/);
  });

  it("dry run always uses the offline fixture", () => {
    const env = parseAgentEnv({ AGENT_DRY_RUN: "true", EMBEDDINGS_PROVIDER: "openai", OPENAI_API_KEY: "sk-test" });
    expect(getEmbeddingsProvider(env)?.id).toBe("fixture");
  });
});

describe("fixture provider", () => {
  it("is deterministic, normalised and ranks related text higher", async () => {
    const p = createFixtureProvider(128);
    const { vectors } = await p.embed(
      ["Paystack payment gateway fees in Nigeria", "Paystack payment gateway fees Nigeria 2026", "Church website design ideas"],
      "document",
    );
    const again = await p.embed(["Paystack payment gateway fees in Nigeria"], "document");
    expect(again.vectors[0]).toEqual(vectors[0]);
    expect(Math.hypot(...vectors[0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity(vectors[0], vectors[1])).toBeGreaterThan(cosineSimilarity(vectors[0], vectors[2]));
  });
});

describe("HTTP providers (mocked, no network)", () => {
  const ok = (dims: number, n: number) =>
    vi.fn(async () =>
      new Response(JSON.stringify({ data: Array.from({ length: n }, (_, i) => ({ index: i, embedding: Array(dims).fill(1) })), usage: { total_tokens: 1000 } }), { status: 200 }),
    );

  it("OpenAI: sends model + dimensions, normalises vectors and reports cost", async () => {
    const fetchMock = ok(8, 2);
    vi.stubGlobal("fetch", fetchMock);
    const p = createOpenAiProvider({ apiKey: "sk-test", dims: 8 });
    const result = await p.embed(["a", "b"], "document");
    expect(result.vectors).toHaveLength(2);
    expect(Math.hypot(...result.vectors[0])).toBeCloseTo(1, 6);
    expect(result.costUsd).toBeCloseTo(0.00002, 8);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ model: "text-embedding-3-small", dimensions: 8, input: ["a", "b"] });
  });

  it("Voyage: passes input_type and rejects unsupported dimensions", async () => {
    const fetchMock = ok(256, 1);
    vi.stubGlobal("fetch", fetchMock);
    await createVoyageProvider({ apiKey: "v", dims: 256 }).embed(["q"], "query");
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ input_type: "query", output_dimension: 256 });
    expect(() => createVoyageProvider({ apiKey: "v", dims: 1536 })).toThrow(EmbeddingsError);
  });

  it("flags rate limits as retryable and bad shapes as permanent", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    await expect(createOpenAiProvider({ apiKey: "k", dims: 8 }).embed(["a"], "document")).rejects.toMatchObject({ retryable: true });

    vi.stubGlobal("fetch", ok(4, 1));
    await expect(createOpenAiProvider({ apiKey: "k", dims: 8 }).embed(["a"], "document")).rejects.toMatchObject({ retryable: false });
  });
});
