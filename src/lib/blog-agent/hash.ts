import { createHash } from "node:crypto";

/** Stable content fingerprint used to bind QA, validation and indexing to an exact article version. */
export function contentHash(...parts: readonly (string | null | undefined)[]): string {
  const h = createHash("sha256");
  for (const part of parts) {
    h.update(part ?? "");
    h.update("\u0000");
  }
  return h.digest("hex");
}
