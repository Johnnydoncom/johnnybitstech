import { describe, expect, it } from "vitest";
import { isBlobStorageConfigured } from "@/lib/blob-storage";

describe("isBlobStorageConfigured", () => {
  it("accepts an OIDC store id or a read-write token, and nothing else", () => {
    expect(isBlobStorageConfigured({ BLOB_STORE_ID: "store_abc123" })).toBe(true);
    expect(isBlobStorageConfigured({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_x" })).toBe(true);
    expect(isBlobStorageConfigured({})).toBe(false);
    expect(isBlobStorageConfigured({ BLOB_STORE_ID: "  ", BLOB_READ_WRITE_TOKEN: "" })).toBe(false);
    expect(isBlobStorageConfigured({ VERCEL_OIDC_TOKEN: "x" })).toBe(false); // the token alone names no store
  });
});
