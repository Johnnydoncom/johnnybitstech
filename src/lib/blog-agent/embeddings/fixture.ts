import { createHash } from "node:crypto";
import { l2Normalize, type EmbeddingsProvider } from "./types";

/**
 * Deterministic, offline embeddings for tests and dry runs: a hashed bag of word stems.
 * Texts that share words get similar vectors, which is enough to exercise ranking logic.
 */
export function createFixtureProvider(dims = 256): EmbeddingsProvider {
  const embedOne = (text: string) => {
    const vector = new Array<number>(dims).fill(0);
    const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    for (const word of words) {
      const stem = word.length > 4 ? word.slice(0, 5) : word;
      const digest = createHash("sha256").update(stem).digest();
      const index = digest.readUInt32BE(0) % dims;
      vector[index] += digest[4] & 1 ? 1 : -1;
    }
    return l2Normalize(vector);
  };

  return {
    id: "fixture",
    model: `fixture-bow-${dims}`,
    dims,
    async embed(texts) {
      const tokens = texts.reduce((n, t) => n + Math.ceil(t.length / 4), 0);
      return { vectors: texts.map(embedOne), tokens, costUsd: 0 };
    },
  };
}
