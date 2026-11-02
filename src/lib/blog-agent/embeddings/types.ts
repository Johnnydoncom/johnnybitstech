export type EmbeddingKind = "document" | "query";

export type EmbeddingResult = {
  vectors: number[][];
  tokens: number;
  costUsd: number;
};

export interface EmbeddingsProvider {
  readonly id: "openai" | "voyage" | "fixture";
  readonly model: string;
  readonly dims: number;
  embed(texts: readonly string[], kind: EmbeddingKind): Promise<EmbeddingResult>;
}

export class EmbeddingsError extends Error {
  constructor(message: string, readonly retryable: boolean, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmbeddingsError";
  }
}

export function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}
