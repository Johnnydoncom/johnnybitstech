# Blog agent — setup and operations

Design and decisions: [`blog-agent-plan.md`](./blog-agent-plan.md). This file is the runbook.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Recon and plan | Done |
| 1 | Blog SEO fixes, `articles` model, migrations, backfill, link targets, retrieval, brand context, tests | Done |
| 2 | OAuth + `/api/mcp` + run/queue/stage tools | Done (tested locally against production 2026-11-02) |
| 3 | Linking, SEO package, validators, indexing, `create_draft` | Done |
| 4 | `/admin/blog-agent` + publish flow | Done |
| 5 | Hardening, retention, spend cap, end-to-end test, docs | Done |
| 6 | Cowork skills + scheduled task | **Skills and task prompt done; supervised runs after deploy** (see [`cowork/blog-agent-task.md`](./cowork/blog-agent-task.md)) |

## Commands

| Command | What it does |
|---|---|
| `npm run test` | Unit + integration tests on in-memory Postgres (PGlite + pgvector + pg_trgm). No network, no Neon |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:status` | Lists migrations and whether each is applied |
| `npm run db:migrate` | Applies pending migrations in `db/migrations`, each in a transaction |
| `npm run db:rollback [-- N]` | Reverts the latest (or latest N) migrations using the `.down.sql` files |
| `npm run agent:seed` | Upserts authors + link targets, copies legacy `blog_posts` into `articles`. Safe to re-run |
| `npm run agent:index-backfill` | Index entries for published posts (+ embeddings when a provider is set). Safe to re-run |
| `npm run agent:maintenance` | Runs the daily retention job once (same as the cron) |
| `npm run agent:optimize-images` | Converts `public/assets/blog` PNG/JPEG to WebP < 400 KB; `-- --update-db` repoints posts (after deploy) |
| `npm run test:local` | End-to-end test on your machine against `.env.local`'s database (or double-click `test-local.cmd`) |

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
| `find_link_candidates` | Related published articles + site pages (lexical; hybrid when embeddings are on), always the service/portfolio/contact pages, and the link-count range |
| `apply_internal_links` | Inserts the `s8_links` picks into the draft in code, after checking every rule; verifies the result |
| `build_seo_package` | Unique slug, canonical, JSON-LD, word count, read time, Flesch score, keyword density/placement |
| `validate_article` | Hard gate (see below); returns `passed` + exact errors |
| `index_article` | Retrieval units (full, intro, each H2, FAQ, meta), embedded and verified when embeddings are on |
| `create_draft` | Gated; creates the `pending_review` article + index entries (not searchable) in one statement |
| `report_failure` | Stops the run as `needs_human` with a report |

No publish, approve, reject or delete tool exists; a test fails if one is ever added.
**Run order** (every save and `get_run` return `next_stage`): `s1_keyword` → `check_cannibalization` → `s3_brief` →
`s4_research` → `s5_outline` → `s6_draft` → `find_link_candidates` → `s8_links` → `apply_internal_links` → `s7_seo` →
`build_seo_package` → `s9_qa` → `validate_article` → `index_article` → `create_draft`.

**Version binding:** the linked article, SEO package, validation and index are tied to content hashes. Re-saving the
draft (s6) makes all of them stale, and `create_draft` refuses until each is redone for the current text. QA (s9) is
bound to the exact draft it reviewed.

**Link rules (enforced in code):** 3 to ~1 per 250 words (max 10) internal links including any already in the draft;
only published pages; each URL once; no repeated anchors; anchor verbatim in a sentence that appears exactly once;
plain text only (not in headings, footnotes, existing links, code or split by bold/italic); at least one service,
portfolio or contact link.

**Validation (hard errors):** no H1, first heading H2, no skipped levels, no duplicate headings, ≥3 H2s, an FAQ H2;
word count within −15%/+25% of the brief; no `[[NEEDS_SOURCE]]`; every sentence with a figure (%, currency, scale
words, or a 2+-digit number that is not a year) cites research; every citation is a saved research item with a
definition linking its exact source; external links only to research sources; internal links exist and are in range;
no banned brand claims; keyword density ≤ 3.5%; meta lengths; FAQ structured data identical to the visible FAQ;
BlogPosting JSON-LD matches the title and canonical. Readability, keyword placement and density 2.5–3.5% are warnings.

**Rolling out Phase 3:** `npm install` → `npm run db:migrate` (applies `0003`) → deploy. Optional: `npm run agent:index-backfill`.

**Testing locally with MCP Inspector:** set `OAUTH_ISSUER=http://localhost:3000` in `.env.local`, run `npm run dev`,
then `npx @modelcontextprotocol/inspector`, choose Streamable HTTP, URL `http://localhost:3000/api/mcp`, and use the
OAuth flow (Inspector registers itself via DCR with a localhost redirect, which is allowed).

**Rolling out Phase 2:** `npm install` → `npm run db:migrate` (applies `0002`) → deploy. Vercel preview deployments
behind Vercel Authentication cannot be reached by Claude; test previews with the Inspector instead.

## Admin: review and publish (Phase 4)

`/admin/blog-agent` (admin role required; every action is a Server Action, which Next.js protects with an
Origin/Host check, and is written to `audit_log`):

| Page | What you can do |
|---|---|
| Overview | Counts: drafts awaiting review, runs needing a human, runs in progress, queue, connections |
| Keyword queue | Add keywords in bulk (priority 0–100), change priority, skip, re-queue failed/skipped, delete |
| Runs | Every run; the detail page shows each saved stage version (JSON), why a run stopped, the overlap check, tool calls; abandon a run, re-queue its keyword |
| Drafts → review | Edit title, slug (locked once an article has been live), unpublish, SEO fields and the Markdown; change or remove internal links (only to published pages); upload the featured image; live preview with the real blog styles; QA report and sources |
| Connections | Connector URL, revoke connections, recent tool calls |

**Publish** is blocked until the featured image and its alt text are set and the article passes the validator again on
its current text (figures cited, no `[[NEEDS_SOURCE]]`, no banned claims, links real, FAQ data in sync, …).
Word count, link count and section count only warn, since you may edit deliberately. Publishing rebuilds the index
from the current text, then in one statement sets `published`, `published_at`, the article's own canonical, and
makes the index searchable; `/blog`, the post and the sitemap are revalidated. Saving the FAQ section re-extracts
the FAQ structured data, so it never drifts from the page. **Reject** needs a reason and can re-queue the keyword;
only rejected articles can be deleted.

**Generating the featured image (optional, free):** the agent writes an image prompt (S7). On the review page,
**Generate image** sends it (editable first) to Cloudflare Workers AI's FLUX.1 [schnell] model, centre-crops the
1024 × 1024 result to 1024 × 538 (the 1.91:1 social-card shape) and saves it like an upload. Text, logos and
watermarks are excluded in the prompt automatically. Cost: free within Cloudflare's 10,000 Neurons a day (about 60
per image); `IMAGE_GEN_DAILY_LIMIT` (20) caps clicks so the allowance is never exhausted. Gemini's API has no free
tier for image models, so it is not used; you can still make an image free in the Gemini app and upload it.
Setup: Cloudflare dashboard → Workers AI → **Use REST API** → copy the Account ID and create an API token
(Workers AI permission) → set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN` in Vercel → redeploy. Without
them the page offers upload only. Always check a generated image suits the article and that the alt text describes it.

**Images:** every upload is converted to WebP under 400 KB (auto-rotated, metadata stripped, resized to at most
1600 px only if needed). Originals up to 4 MB (Vercel's request limit is 4.5 MB), at least 600 × 315 px.
Stored in Vercel Blob: create a Blob store (Vercel → Storage → Blob → connect to the project), which adds
`BLOB_READ_WRITE_TOKEN`; copy it into `.env.local` for local use.

**Existing post images:** `public/assets/blog/*.webp` (85–204 KB) replace the 700–970 KB PNGs. Roll out in this order:
deploy (so the .webp files exist), then `npm run agent:optimize-images -- --update-db` (repoints featured images and
inline images; `updated_at` is preserved). Delete the PNGs in a later commit.

**Rolling out Phase 4:** `npm install` → deploy → create the Blob store. No new migration.

## Operations (Phase 5)

**Rolling out Phase 5:** set `CRON_SECRET` in Vercel (Production) → deploy. `vercel.json` registers the daily job
(03:17 UTC). No new migration. Check it under Vercel → Project → Settings → Cron Jobs, or run it by hand with
`npm run agent:maintenance`.

**Daily maintenance** (`/api/cron/maintenance`, bearer `CRON_SECRET`; refuses with 503 if the secret is unset):

| What | Removed after |
|---|---|
| Runs with no activity | 6 h → marked `abandoned`, keyword re-queued |
| Sign-in codes and consent requests | 1 day past expiry |
| Access/refresh tokens | 1 day past expiry |
| Revoked connections | 30 days |
| Registered (DCR) clients that never signed in | 7 days (never while a live connection uses them) |
| `mcp_call_log` | 90 days |
| `rate_limits` windows | 1 day |

`audit_log` and `articles` are never pruned. Each run that removes anything writes a `maintenance.prune` audit entry.

**Limits and safeguards:**

| Limit | Value | Where |
|---|---|---|
| Tool calls per connection | `MCP_RATE_LIMIT_PER_MIN` (120/min) | `/api/mcp` |
| One stage output | 300 KB | `save_stage_output` |
| Embedding spend per run | `AGENT_MAX_EMBEDDING_USD_PER_RUN` ($0.50) | `find_link_candidates` falls back to lexical; `index_article` skips vectors (`embedding_skipped: "budget"`); the next `agent:index-backfill` embeds them |
| Image upload | 4 MB, 600 × 315 to 8000 × 6000 px, output WebP < 400 KB | review page |
| Admin, consent and `/oauth/*` pages | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `noindex`, `no-referrer` | `next.config.ts` |

**Adding the connector in Claude (Cowork):** Settings → Connectors → Add custom connector → name "Johnnybits Blog",
URL `https://johnnybits.com/api/mcp` → Connect. A johnnybits.com tab opens: log in to the admin if asked, check the
client name and redirect on the consent screen, Approve. Claude refreshes tokens itself; a connection that is unused
for 30 days must be reconnected. The scheduled task (Phase 6) uses the same connector.

**Rotating secrets:**

| Secret | How | Effect |
|---|---|---|
| `SESSION_SECRET` | `openssl rand -base64 32` → Vercel (Production + Preview) and `.env.local` → redeploy | Everyone is logged out of the admin; connector tokens keep working |
| Connector tokens | `/admin/blog-agent/connections` → Revoke (one or all) | Claude gets 401 and asks you to reconnect. Tokens are stored hashed, so a database leak does not expose usable tokens |
| `MCP_STATIC_TOKEN` (only if used) | New 32+ char value in Vercel and in the organisation's connector header → redeploy. Empty disables it | Old value stops working on deploy |
| `CRON_SECRET` | New value in Vercel → redeploy | Vercel Cron picks it up automatically |
| `DATABASE_URL` | Neon → Roles → Reset password → update Vercel (both URLs) and `.env.local` → redeploy | — |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → the Blob store → regenerate → redeploy | Existing image URLs keep working |

If a token or the admin password may have leaked: revoke all connections, rotate `SESSION_SECRET`, change the admin
password, then read `audit_log` and `mcp_call_log` for the period (`/admin/blog-agent/runs` shows calls per run).

**Recovering runs:**

| Symptom | What to do |
|---|---|
| Run `needs_human` | Open it in `/admin/blog-agent/runs`; the report says which check failed and what to fix. **Resume run** keeps all saved stages: the next agent session (scheduled or Run now) adopts the run, reads the report and continues from where it stopped. Or **Abandon run** and **Re-queue keyword** to start clean |
| Claude stopped mid-run (timeout, closed session) | Nothing: `claim_next_keyword` on the same connection resumes the open run, and `get_run` says the next stage. Stages already saved are kept |
| A stage is reported stale | An earlier stage was re-saved. Redo the stages `get_run` lists as stale; `create_draft` refuses until they match the current draft |
| Run stuck in `running` | It is abandoned automatically after 6 h without activity; to free the keyword now, **Abandon** it on the run page |
| `create_draft` refused with a slug conflict | `build_seo_package` again (it picks a unique slug), then validate, index, create |
| Draft is wrong | **Reject** with a reason (optionally re-queue). Rejected drafts can be restored to review or deleted |
| Bad article went live | **Unpublish** on its review page: it leaves the site and search at once, goes back to review with its URL and publish date kept, and you are told which published posts still link to it. Or just edit it (re-validated and re-indexed on save) |

**`blog_posts` (legacy table):** keep it, unchanged, until the new blog has run in production for about two weeks
with no rollback. Then: take a Neon backup branch, delete `src/scripts/{migrate,add-column,seed-blogs}.js` (the only
code still using it), and drop it in a new migration `0004_drop_blog_posts` whose down migration restores it from
`articles` (`content_format = 'html'`). Until then `npm run db:rollback` plus a redeploy fully restores the old blog.

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

Template with comments: [`.env.example`](../.env.example). Production values live in Vercel → Project → Settings →
Environment Variables.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooled connection (app runtime) |
| `DATABASE_URL_UNPOOLED` | Recommended | Direct connection for migrations |
| `SESSION_SECRET` | Yes | Admin session signing; random, 32+ characters |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://johnnybits.com` in production (canonicals, sitemap, OAuth issuer default) |
| `BLOB_READ_WRITE_TOKEN` | For image uploads | Added by connecting a Vercel Blob store |
| `CRON_SECRET` | Yes (Phase 5) | Authenticates the daily maintenance cron |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_TOKEN` | No | Free featured-image generation (Workers AI); empty = upload only |
| `IMAGE_GEN_DAILY_LIMIT` | No | Generated images per 24 h (20) |
| `OAUTH_ISSUER` | No | Overrides the OAuth issuer (local testing: `http://localhost:3000`) |
| `OAUTH_ALLOWED_CLIENT_HOSTS` | No | CIMD hosts, default `claude.ai,claude.com` |
| `MCP_STATIC_TOKEN` | No | Fixed bearer token for header-auth connectors; empty = OAuth only |
| `MCP_RATE_LIMIT_PER_MIN` | No | Tool calls per minute per connection (120) |
| `RETRIEVAL_MODE` | No | `lexical` (default) or `hybrid` |
| `EMBEDDINGS_PROVIDER`, `EMBEDDINGS_MODEL`, `EMBEDDINGS_DIMS`, `EMBEDDINGS_USD_PER_MTOK`, `OPENAI_API_KEY`, `VOYAGE_API_KEY` | Only for hybrid | Vector search provider and pricing |
| `AGENT_MAX_EMBEDDING_USD_PER_RUN` | No | Embedding spend cap per run ($0.50) |
| `AGENT_DRY_RUN` | No | `true` = no paid calls |
| `AGENT_FAQ_SCHEMA` | No | `true` = FAQPage structured data on articles with an FAQ |

Agent settings are validated at startup; a misconfiguration fails with one message listing every problem.
