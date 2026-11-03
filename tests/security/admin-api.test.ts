import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
const execute = vi.fn();
vi.mock("@/lib/db", () => ({ query, execute }));
vi.mock("@/lib/auth", () => ({
  verifySession: async () => ({ email: "admin@johnnybits.com" }),
  verifyCredentials: async () => true,
  createSession: async () => undefined,
}));

const SITE = "https://johnnybits.com";
const req = (method: string, path: string, body?: unknown, origin: string | null = SITE) =>
  new Request(`${SITE}${path}`, {
    method,
    headers: { host: "johnnybits.com", "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = { params: Promise.resolve({ id: "1" }) };

beforeEach(() => {
  query.mockReset();
  execute.mockReset();
});

describe("/api/admin/settings", () => {
  it("never sends the SMTP password back, only whether one is saved", async () => {
    query.mockResolvedValue([
      { setting_key: "smtp_host", setting_value: "smtp-relay.brevo.com" },
      { setting_key: "smtp_pass", setting_value: "super-secret" },
    ]);
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ smtp_host: "smtp-relay.brevo.com", smtp_pass_set: true });
    expect(JSON.stringify(body)).not.toContain("super-secret");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps the saved password when the field is left blank, and saves a new one when typed", async () => {
    const { POST } = await import("@/app/api/admin/settings/route");
    await POST(req("POST", "/api/admin/settings", { smtp_host: "h", smtp_pass: "" }));
    expect(execute.mock.calls.map((c) => c[1][0])).toEqual(["smtp_host"]);
    execute.mockReset();
    await POST(req("POST", "/api/admin/settings", { smtp_pass: "new-secret" }));
    expect(execute.mock.calls.map((c) => c[1])).toEqual([["smtp_pass", "new-secret"]]);
  });
});

describe("cross-site requests to admin APIs", () => {
  it("are refused before any database write", async () => {
    const settings = await import("@/app/api/admin/settings/route");
    const clients = await import("@/app/api/admin/clients/route");
    const client = await import("@/app/api/admin/clients/[id]/route");
    const newsletter = await import("@/app/api/admin/newsletter/route");
    const profile = await import("@/app/api/admin/profile/route");
    const evil = "https://evil.example";
    const responses = await Promise.all([
      settings.POST(req("POST", "/api/admin/settings", { smtp_pass: "x" }, evil)),
      clients.POST(req("POST", "/api/admin/clients", { name: "x" }, evil)),
      client.PUT(req("PUT", "/api/admin/clients/1", { name: "x" }, evil), params),
      client.DELETE(req("DELETE", "/api/admin/clients/1", undefined, evil), params),
      newsletter.DELETE(req("DELETE", "/api/admin/newsletter", { id: 1 }, evil)),
      profile.PUT(req("PUT", "/api/admin/profile", { email: "a@b.c" }, null)),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403]);
    expect(execute).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
