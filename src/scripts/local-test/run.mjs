/**
 * Local end-to-end test runner (Windows, macOS, Linux). Run from the repo root:
 *   npm run test:local        (or double-click test-local.cmd on Windows)
 *
 * 1. npm install, typecheck, unit tests            (stops here on failure: nothing touches the database)
 * 2. db:status → db:migrate → agent:seed            (against DATABASE_URL in .env.local)
 * 3. starts `next dev` on PORT (default 3100), checks pages, SEO, redirects, admin protection
 * 4. OAuth + MCP smoke test over HTTP, then removes the test client
 * Writes everything to local-test.log and a summary to local-test-report.json. Never prints secrets.
 */
import { spawn } from "node:child_process";
import { createWriteStream, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.PORT || 3100);
const BASE = `http://localhost:${PORT}`;
const log = createWriteStream("local-test.log", { flags: "w" });
const report = { startedAt: new Date().toISOString(), steps: [], checks: [], ok: false };
const isWin = process.platform === "win32";

function out(line) {
  process.stdout.write(`${line}\n`);
  log.write(`${line}\n`);
}

function envValue(name) {
  try {
    const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim().replace(/^"(.*)"$/, "$1") : undefined;
  } catch {
    return undefined;
  }
}

function run(name, command, { env = {}, allowFail = false } = {}) {
  return new Promise((resolve) => {
    out(`\n===== ${name} =====\n$ ${command}`);
    const started = Date.now();
    const child = spawn(command, { shell: true, env: { ...process.env, FORCE_COLOR: "0", ...env } });
    child.stdout.on("data", (d) => { process.stdout.write(d); log.write(d); });
    child.stderr.on("data", (d) => { process.stderr.write(d); log.write(d); });
    child.on("close", (code) => {
      const ok = code === 0;
      report.steps.push({ name, ok, exitCode: code, seconds: Math.round((Date.now() - started) / 1000) });
      out(`----- ${name}: ${ok ? "OK" : `FAILED (exit ${code})`} -----`);
      resolve(ok || allowFail);
    });
  });
}

function check(name, ok, detail = "") {
  report.checks.push({ name, ok, detail });
  out(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function get(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", signal: AbortSignal.timeout(180_000), ...opts });
  return { res, text: await res.text() };
}

function killTree(child) {
  if (!child?.pid) return;
  if (isWin) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  else try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
}

async function httpChecks() {
  const site = (envValue("NEXT_PUBLIC_SITE_URL") || "https://johnnybits.com").replace(/\/+$/, "");
  const canonical = (html) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const ogUrl = (html) => html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];

  const blog = await get("/blog");
  const slugs = [...new Set([...blog.text.matchAll(/href="\/blog\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
  // React may emit "<!-- -->" between adjacent text nodes, e.g. "</svg> <!-- -->5 min</span>".
  const minutes = [...blog.text.matchAll(/(\d+)(?:<!-- -->)?\s?min</g)].map((m) => Number(m[1]));
  check("/blog renders", blog.res.status === 200, `status ${blog.res.status}`);
  check("/blog lists the published posts", slugs.length >= 10, `${slugs.length} posts`);
  check("/blog canonical + og:url are /blog", canonical(blog.text) === `${site}/blog` && ogUrl(blog.text) === `${site}/blog`, `${canonical(blog.text)} | ${ogUrl(blog.text)}`);
  check("Read times are real (not all '1 min')", minutes.length > 0 && minutes.some((m) => m > 1), minutes.join(","));

  if (slugs[0]) {
    const post = await get(`/blog/${slugs[0]}`);
    check("Post renders", post.res.status === 200, `/blog/${slugs[0]} → ${post.res.status}`);
    check("Post canonical + og:url are its own URL", canonical(post.text) === `${site}/blog/${slugs[0]}` && ogUrl(post.text) === `${site}/blog/${slugs[0]}`, canonical(post.text));
    check("Post shows Odoh John byline", post.text.includes("Odoh John"));
    check("Post JSON-LD has BlogPosting + Person author", post.text.includes('"@type":"BlogPosting"') && post.text.includes('"@type":"Person"'));
    check("Post HTML has no <script> inside the article body", !/class="blog-content"[^>]*>(?:(?!<\/article>)[\s\S])*<script/i.test(post.text));
  }

  const sitemap = await get("/sitemap.xml");
  const sitemapPosts = (sitemap.text.match(/\/blog\/[a-z0-9-]+<\/loc>/g) ?? []).length;
  check("Sitemap lists the posts", sitemap.res.status === 200 && sitemapPosts >= 10, `${sitemapPosts} post URLs`);
  check("Sitemap no longer lists the redirected corporate URL", !sitemap.text.includes("/corporate-web-design-company<"));

  const redirect = await get("/services/web-development-services");
  check("/services/<slug> 301/308 → canonical page", [301, 308].includes(redirect.res.status) && (redirect.res.headers.get("location") ?? "").endsWith("/web-development-services"), `${redirect.res.status} → ${redirect.res.headers.get("location")}`);
  const home = await get("/");
  check("Homepage still renders", home.res.status === 200, `status ${home.res.status}`);
  const portfolio = await get("/portfolio");
  check("/portfolio canonical is /portfolio (not the homepage)", canonical(portfolio.text) === `${site}/portfolio`, canonical(portfolio.text));

  const admin = await get("/admin/blog-agent/connections");
  check("Admin pages redirect to login with ?next=", admin.res.status === 307 && (admin.res.headers.get("location") ?? "").includes("next=%2Fadmin%2Fblog-agent%2Fconnections"), admin.res.headers.get("location") ?? "");
  const api = await get("/api/admin/blog");
  check("Admin blog API requires a session", api.res.status === 401, `status ${api.res.status}`);
  const csrf = await get("/api/admin/blog", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
  check("Admin blog API rejects cross-site writes", csrf.res.status === 403, `status ${csrf.res.status}`);
}

async function main() {
  out(`Johnnybits local test — ${report.startedAt}`);
  const steps = [
    ["Install dependencies", "npm install --no-audit --no-fund"],
    ["Typecheck", "npm run typecheck"],
    ["Unit + integration tests", "npm run test"],
    ["Migration status (before)", "npm run db:status"],
    ["Apply migrations", "npm run db:migrate"],
    ["Seed authors, link targets, backfill posts", "npm run agent:seed"],
    ["Migration status (after)", "npm run db:status"],
  ];
  for (const [name, cmd] of steps) {
    if (!(await run(name, cmd))) return finish();
  }

  out(`\n===== Start dev server on ${BASE} =====`);
  const dev = spawn(`npx next dev -p ${PORT}`, {
    shell: true,
    detached: !isWin,
    env: { ...process.env, FORCE_COLOR: "0", OAUTH_ISSUER: BASE, NEXT_TELEMETRY_DISABLED: "1" },
  });
  dev.stdout.on("data", (d) => log.write(d));
  dev.stderr.on("data", (d) => log.write(d));
  try {
    let up = false;
    for (let i = 0; i < 90 && !up; i++) {
      await sleep(2000);
      up = await fetch(`${BASE}/api/oauth/well-known/authorization-server`).then((r) => r.ok, () => false);
    }
    check("Dev server started", up);
    if (up) {
      out("\n===== Page, SEO and security checks =====");
      await httpChecks().catch((e) => check("Page checks crashed", false, String(e)));
      await run("OAuth + MCP smoke test (cleans up after itself)", "npx tsx src/scripts/local-test/oauth-mcp-smoke.ts", { env: { BASE_URL: BASE }, allowFail: true });
    }
  } finally {
    killTree(dev);
  }
  finish();
}

function finish() {
  const failedChecks = report.checks.filter((c) => !c.ok).length;
  const failedSteps = report.steps.filter((s) => !s.ok).length;
  report.ok = failedChecks === 0 && failedSteps === 0;
  report.finishedAt = new Date().toISOString();
  writeFileSync("local-test-report.json", JSON.stringify(report, null, 2));
  out(`\n===== RESULT: ${report.ok ? "ALL PASSED" : `${failedSteps} step(s) and ${failedChecks} check(s) failed`} =====`);
  out("Full log: local-test.log   Summary: local-test-report.json");
  log.end();
  setTimeout(() => process.exit(report.ok ? 0 : 1), 500);
}

main().catch((e) => {
  out(`Runner crashed: ${e?.stack ?? e}`);
  finish();
});
