import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyCredentials = vi.fn();
const createSession = vi.fn();
let key: Uint8Array | null = null;

vi.mock("@/lib/auth", () => ({ verifyCredentials, createSession }));
vi.mock("@/lib/session-key", () => ({ getSessionKey: () => key }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { to }); } }));

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("admin loginAction", () => {
  beforeEach(() => {
    verifyCredentials.mockReset();
    createSession.mockReset();
  });

  it("explains a missing SESSION_SECRET instead of throwing, without checking the password", async () => {
    key = null;
    const { loginAction } = await import("@/app/(admin)/admin/login/actions");
    const result = await loginAction(undefined, form({ email: "admin@johnnybits.com", password: "x" }));
    expect(result).toEqual({ error: expect.stringMatching(/SESSION_SECRET/) });
    expect(verifyCredentials).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("logs in and redirects when the secret is configured", async () => {
    key = new TextEncoder().encode("s".repeat(32));
    verifyCredentials.mockResolvedValue(true);
    const { loginAction } = await import("@/app/(admin)/admin/login/actions");
    await expect(loginAction(undefined, form({ email: "admin@johnnybits.com", password: "pw", next: "/admin/blog-agent" }))).rejects.toMatchObject({ to: "/admin/blog-agent" });
    expect(createSession).toHaveBeenCalledWith("admin@johnnybits.com");
  });

  it("still rejects wrong passwords", async () => {
    key = new TextEncoder().encode("s".repeat(32));
    verifyCredentials.mockResolvedValue(false);
    const { loginAction } = await import("@/app/(admin)/admin/login/actions");
    expect(await loginAction(undefined, form({ email: "a@b.c", password: "bad" }))).toEqual({ error: "Invalid email or password." });
    expect(createSession).not.toHaveBeenCalled();
  });
});
