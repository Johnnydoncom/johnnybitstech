import { afterEach, describe, expect, it, vi } from "vitest";
import { isSameOrigin } from "@/lib/security/same-origin";

const req = (method: string, headers: Record<string, string>) => new Request("https://johnnybits.com/api/admin/blog", { method, headers });

describe("isSameOrigin (CSRF)", () => {
  it("allows safe methods", () => {
    expect(isSameOrigin(req("GET", {}))).toBe(true);
  });

  it("allows same-origin writes and rejects cross-site or missing origin", () => {
    expect(isSameOrigin(req("POST", { host: "johnnybits.com", origin: "https://johnnybits.com" }))).toBe(true);
    expect(isSameOrigin(req("PUT", { host: "johnnybits.com", referer: "https://johnnybits.com/admin/blog/1/edit" }))).toBe(true);
    expect(isSameOrigin(req("DELETE", { host: "johnnybits.com", origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(req("POST", { host: "johnnybits.com" }))).toBe(false);
    expect(isSameOrigin(req("POST", { host: "johnnybits.com", origin: "null" }))).toBe(false);
  });
});

describe("getSessionKey (fail closed)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const load = async () => (await import("@/lib/session-key")).getSessionKey();

  it("refuses a missing or trivially short secret instead of using a fallback", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("SESSION_SECRET", "");
    expect(await load()).toBeNull();
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", "short");
    expect(await load()).toBeNull();
  });

  it("accepts the current 25+ character secrets, warning below 32", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("SESSION_SECRET", "x".repeat(25));
    expect(await load()).toBeInstanceOf(Uint8Array);
    expect(warn).toHaveBeenCalled();
  });
});
