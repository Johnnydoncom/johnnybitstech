/**
 * Renders every Blog Agent admin page against the running local server with a short-lived (10 min) admin
 * session minted from SESSION_SECRET for an existing admin user. Read-only: no forms are submitted.
 * Usage: BASE_URL=http://localhost:3100 npx tsx src/scripts/local-test/admin-smoke.ts
 */
import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { SignJWT } from "jose";

loadEnv({ path: ".env.local" });
loadEnv();

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
let failed = 0;
const record = (name: string, ok: boolean, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

async function main() {
  const secret = process.env.SESSION_SECRET;
  const url = process.env.DATABASE_URL;
  if (!secret || !url) throw new Error("SESSION_SECRET and DATABASE_URL must be set");
  const sql = neon(url);
  const [admin] = (await sql.query("SELECT email FROM admin_users WHERE role = 'admin' ORDER BY id LIMIT 1")) as { email: string }[];
  if (!admin) throw new Error("No admin user with role 'admin' found");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const token = await new SignJWT({ email: admin.email, expiresAt: expiresAt.toISOString() })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(secret));
  const cookie = `session=${token}`;

  const pages: [string, string][] = [
    ["/admin/blog-agent", "Drafts awaiting review"],
    ["/admin/blog-agent/queue", "Add keywords (one per line)"],
    ["/admin/blog-agent/runs", "Runs"],
    ["/admin/blog-agent/drafts", "Drafts"],
    ["/admin/blog-agent/connections", "Connector URL"],
    ["/admin/blog", "Blog Posts"],
  ];
  for (const [path, text] of pages) {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
    const html = await res.text();
    record(`${path} renders for the admin`, res.status === 200 && html.includes(text), `status ${res.status}`);
  }
  const missing = await fetch(`${BASE}/admin/blog-agent/drafts/00000000-0000-4000-8000-000000000000`, { headers: { cookie }, redirect: "manual" });
  record("Unknown draft → 404", missing.status === 404, `status ${missing.status}`);
  const anon = await fetch(`${BASE}/admin/blog-agent/queue`, { redirect: "manual" });
  record("Signed-out visitors are sent to login", anon.status === 307, `status ${anon.status}`);

  const [draft] = (await sql.query("SELECT id FROM articles WHERE content_format = 'markdown' ORDER BY created_at DESC LIMIT 1")) as { id: string }[];
  if (draft) {
    const res = await fetch(`${BASE}/admin/blog-agent/drafts/${draft.id}`, { headers: { cookie }, redirect: "manual" });
    const html = await res.text();
    record("Latest agent draft review page renders", res.status === 200 && html.includes("Featured image") && html.includes("blog-content"), `status ${res.status}`);
  } else {
    console.log("SKIP  No agent drafts yet, so the review page was not checked");
  }

  console.log(`\nAdmin smoke: ${failed === 0 ? "all passed" : `${failed} failed`}`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error("Admin smoke crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
