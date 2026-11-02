# Blog agent — setup and operations

Design and decisions: [`blog-agent-plan.md`](./blog-agent-plan.md). This file is the runbook.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Recon and plan | Done |
| 1 | Blog SEO fixes, `articles` model, migrations, backfill, link targets, retrieval, brand context, tests | Done |
| 2 | OAuth + `/api/mcp` + run/queue/stage tools | **Done, awaiting review** |
| 3 | Linking, SEO package, validators, indexing, `create_draft` | Not started |
| 4 | `/admin/blog-agent` + publish flow | Not started |
| 5 | Hardening, docs | Not started |
| 6 | Cowork skills + scheduled task | Not started |

## Commands

| Command | What it does |
|---|---|
| `npm run test` | Unit + integration tests on in-memory Postgres (PGlite + pgvector + pg_trgm). No network, no Neon |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:status` | Lists migrations and whether each is applied |
| `npm run db:migrate` | Applies pending migrations in `db/migrations`, each in a transaction |
| `npm run db:rollback [-- N]` | Reverts the latest (or latest N) migrations using the `.down.sql` files |
| `npm run agent:seed` | Upserts authors + link targets, copies legacy `blog_posts` into `articles`. Safe to re-run |

Scripts read `.env.local` (then `.env`). Migrations use `DATABASE_URL_UNPOOLED` when set, otherwise `DATABASE_URL`.

## Rolling out Phase 1 (order matters)

The blog pages now read from `articles`. **The table must exist and be seeded before this code is deployed**,
otherwise `/blog` and the sitemap fail.

0. **Rotate `SESSION_SECRET` now (urgent, independent of this branch).** The local value is the old hard-coded
   fallback string and the production value is not random. Generate one with `openssl rand -base64 32`, set it in
   Vercel (Production + Preview) and `.env.local`, and redeploy. Everyone is logged out once; nothing else changes.
1. `npm install` (on your machine; new packages were added).
2. Create a Neon branch of production (Neon console → Branches → Create) and put its connection string in
   `.env.local` as `DATABASE_URL`. Test there first.
3. `npm run db:migrate` → expect `Applied: 0001`.
4. `npm run agent:seed` → expect `Legacy posts found: 10`, `inserted (10)`, no slug conflicts.
5. `npm run test` and `npm run dev`, then check `/blog`, two posts, `/sitemap.xml` (10 `/blog/...` URLs),
   `/admin/blog` (list, edit, save), and view-source on a post (`<link rel="canonical">` = the post URL).
6. Production: run steps 3–4 against the production `DATABASE_URL`, then merge/deploy.
7. After deploy: request indexing of `/blog` and two posts in Google Search Console, and resubmit the sitemap.

**Rollback:** redeploy the previous Vercel deployment, then `npm run db:rollback`. `blog_posts` is never modified,
so the old code keeps working against it.

## The MCP connector (Phase 2)

**Endpoint:** `https://johnnybits.com/api/mcp` (Streamable HTTP, `mcp-handler` 2.x on MCP SDK v2; serves both the
2026-07-28 protocol and 2025-era clients). Every call needs a bearer token; unauthenticated calls get a `401` with
`WWW-Authenticate: Bearer resource_metadata="https://johnnybits.com/.well-known/oauth-protected-resource/api/mcp"`.

**Sign-in (OAuth 2.1, built into the app):**

| Endpoint | Purpose |
|---|---|
| `/.well-known/oauth-protected-resource[/api/mcp]` | RFC 9728 metadata (`resource` = the exact MCP URL) |
| `/.well-known/oauth-authorization-server` | RFC 8414 metadata (PKCE S256, CIMD, DCR, public clients) |
| `/oauth/authorize` | Validates the request, then sends you to the consent screen in the admin |
| `/admin/connector/authorize/{id}` | Consent screen (needs the admin login) |
| `/oauth/token` | Code exchange (PKCE) and refresh (rotating refresh tokens) |
| `/oauth/register` | Dynamic Client Registration fallback |
| `/oauth/revoke` | RFC 7009 revocation |

Security properties: only Claude's callback (`https://claude.ai/api/mcp/auth_callback`) and loopback redirects are
accepted; Client ID Metadata Documents only from `OAUTH_ALLOWED_CLIENT_HOSTS`; codes are single-use (a replay revokes
the connection); refresh-token reuse revokes the connection (30 s grace for concurrent refreshes); tokens are stored
as SHA-256 hashes; access tokens last 1 hour, refresh tokens 30 days; every tool call is rate-limited (Postgres,
per connection) and logged to `mcp_call_log`; approvals and revocations go to `audit_log`.

**Connecting Claude (after deploy):** Claude → Settings → Connectors → Add custom connector → name
"Johnnybits Blog", URL `https://johnnybits.com/api/mcp` → Connect → log in to the admin if asked → Approve.
Manage or revoke connections at `/admin/blog-agent/connections` (also shows the last 25 tool calls).

**Tools:**

| Tool | What it does |
|---|---|
| `get_brand_context` | Brand facts, services + canonical URLs, tone, CTAs, authors, portfolio, approved/banned claims |
| `search_site_content` | Lexical search over published articles and site pages |
| `enqueue_keywords` | Adds keywords (priority ≤ 80; duplicates skipped) |
| `save_cluster_plan` | Stage 2 batch mode: clusters + their keywords |
| `claim_next_keyword` | Claims the top keyword **and creates its run atomically**; resumes this connection's open run |
| `create_run` | Starts a run for a named keyword |
| `get_run` | Run + latest version of every stage, next stage, stale stages |
| `save_stage_output` | Validates (schema + site data) and versions a stage; `validate_only` to check first |
| `check_cannibalization` | `ok` / `review` / `block` against published, pending and in-flight content; required before s3 |
| `report_failure` | Stops the run as `needs_human` with a report |

No publish, approve, reject or delete tool exists; a test fails if one is ever added.
Phase 3 adds `find_link_candidates`, `apply_internal_links`, `build_seo_package`, `validate_article`, `index_article`, `create_draft`.

**Testing locally with MCP Inspector:** set `OAUTH_ISSUER=http://localhost:3000` in `.env.local`, run `npm run dev`,
then `npx @modelcontextprotocol/inspector`, choose Streamable HTTP, URL `http://localhost:3000/api/mcp`, and use the
OAuth flow (Inspector registers itself via DCR with a localhost redirect, which is allowed).

**Rolling out Phase 2:** `npm install` → `npm run db:migrate` (applies `0002`) → deploy. Vercel preview deployments
behind Vercel Authentication cannot be reached by Claude; test previews with the Inspector instead.

## Content model notes

- `articles.content_format`: `html` for legacy posts and the Quill editor, `markdown` for agent articles. Both render
  through `src/lib/blog/render.ts` (sanitised; external links get `rel="noopener noreferrer"`).
- `/admin/blog` (Quill) edits only `html` articles in `draft`/`published`. Agent articles are managed in
  `/admin/blog-agent` (Phase 4); the API returns 409 for them.
- Read time = words / 225, computed on save and stored in `reading_minutes`.
- Pages are ISR (`revalidate = 3600`) and refreshed on demand by `revalidateBlog()` after every write.

## Retrieval

`RETRIEVAL_MODE=lexical` (default): Postgres full-text search (OR-ed terms, weighted title > summary > body) plus
`pg_trgm` title similarity, over published articles and active `link_targets`. Claude makes the semantic decisions.
To add vectors later: set `EMBEDDINGS_PROVIDER` + key, then run the embedding backfill (added in Phase 3) and set
`RETRIEVAL_MODE=hybrid`.

## Environment variables

See [`.env.example`](../.env.example).
