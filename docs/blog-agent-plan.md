# Johnnybits Blog Agent — Phase 0 Recon & Plan

Status: **Phase 0 approved 2026-11-02. Phase 1 implemented — see `docs/blog-agent.md`.**
Date: 2026-11-02 · Repo: `Johnnydoncom/johnnybitstech` (branch `main`) · Site: https://johnnybits.com

This plan merges and replaces the three files in `docs/`:
`01-claude-code-master-prompt.md` (authoritative), `02-cowork-scheduled-task-prompt.md`, and `blog-agent-spec.md`.
Where they conflict, this file wins. Section 9 lists every change made to them, with the reason.

**Scope rule:** only blog-related code changes. The site's look stays exactly the same. The public blog pages keep
their current markup and classes; only their data source, metadata and helpers change. Anything outside the blog
is listed in section 2.2 and left alone unless you approve it.

---

## 1. Recon findings

### 1.1 Stack (verified)

| Item | Found |
|---|---|
| Next.js | **16.2.6**, App Router, TypeScript `strict: true`, React 19.2.4. `src/proxy.ts` (Next 16 replacement for middleware) |
| Hosting / DB | Vercel + Neon Postgres via `@neondatabase/serverless` (HTTP driver) |
| Data access | **No ORM.** `src/lib/db.ts` wraps raw SQL and converts MySQL-style `?` placeholders to `$n` |
| Migrations | Ad-hoc JS scripts (`src/scripts/migrate.js`, `add-column.js`, `seed-blogs.js`). Not reversible, no history table |
| Auth | Own JWT session (`jose`, HS256 cookie `session`, 7 days), `admin_users` table (email + bcrypt). Single admin, **no roles** |
| Admin UI | `/admin/*` with shadcn/ui (Radix + Base UI), Tailwind v4, Quill rich-text editor for posts |
| Validation | `zod@4` installed but barely used. API routes destructure `req.json()` with no validation |
| Tests | **None.** No test runner installed |
| Env | `.env.local`, `.env.prod`. **No `.env.example`** |

### 1.2 How the blog works today

- **Storage:** Neon table `blog_posts` (SERIAL id, title, slug, excerpt, `content` **HTML**, tag, `published` boolean,
  meta_title, meta_description, featured_image, timestamps). 10 posts, seeded by `src/scripts/seed-blogs.js`.
- **Rendering:** `/blog` and `/blog/[slug]` are server components that run raw SQL. Post HTML goes straight into
  `dangerouslySetInnerHTML` with no sanitising.
- **Caching:** `.next/prerender-manifest.json` shows **`/blog` is prerendered as static with no revalidate**.
  Nothing calls `revalidatePath`. A post published from the admin **does not show on /blog until the next deploy**.
  `/blog/[slug]` renders on every request, with no caching.
- **Admin CRUD:** `/api/admin/blog` (GET/POST) and `/api/admin/blog/[id]` (GET/PUT/DELETE). They check the session,
  but have no input validation, no CSRF check and no revalidation.

### 1.3 Issues the master prompt asked about (all confirmed)

| # | Issue | Root cause | Severity |
|---|---|---|---|
| A | `/blog` canonical and `og:url` point to `https://johnnybits.com` | The root layout sets `alternates.canonical: SITE_URL`, and `constructMetadata()` always sets `openGraph.url: SITE_URL`. `/blog` passes no `canonicalUrl` | High |
| A2 | **Every blog post also canonicalises to the homepage** (worse than reported) | `blog/[slug]` `generateMetadata` sets no `alternates`, so each post inherits the root `canonical: SITE_URL`. Google is being told all 10 posts are duplicates of the homepage | **Critical** |
| B | Every card on `/blog` shows "1 min" | `blog/page.tsx` uses `split(/\\s+/)`. The double backslash matches a literal backslash, so the word count is always 1. The detail page uses the correct regex but counts HTML tags as words. Posts are also short (about 275 words) | Medium |
| B2 | **Sitemap contains 0 blog posts** (found during recon) | `sitemap.xml/route.ts` queries `WHERE published = 1` on a **boolean** column. Postgres throws `boolean = integer`, the catch block swallows the error, and no posts are output. Confirmed on the live sitemap | **Critical** |
| C | Service URLs exist both as `/web-development-services` and `/services/web-development-services` | `Footer.tsx` links to `/services/${slug}`, but **no `/services/[slug]` route exists, so these are site-wide 404 links**. The admin SEO page also lists old `/services/web-design` paths | High (outside the blog) |
| C2 | Sitemap lists `/corporate-web-design-company` | That URL 301-redirects to `/corporate-web-design-nigeria` | Low |
| D | Marketing figures that disagree with each other | Home page: "5+ Years", "80+ Projects", "5.0★ Google", "+312% Avg traffic growth". Corporate page: **"10+ Years"**, **"150+ Websites & apps"**, "100% senior talent". SEO page: "+312%", "45% lower cost-per-lead". E-commerce page: funnel 100/68/42/39%. The years and project counts contradict each other | Agent must not reuse any of these |
| E | Existing posts contain unsourced figures | For example "₦150,000 → ₦5,000/month (97% reduction)" and "60–70% less JavaScript". The agent will index these posts for linking. They must **not** go on the approved-claims list | Medium |

### 1.4 Other findings

- `SESSION_SECRET` falls back to `"fallback-secret-change-me"` in `auth.ts` and `proxy.ts`. If the env var is ever
  missing, anyone can forge an admin session. The agent's admin flows depend on this, so I will make it fail closed
  (blog-adjacent hardening; needs your OK, see Q3).
- `docs/blog-agent-spec.md` is **not** an 11-stage functional spec. It is an earlier version of the master prompt
  (MySQL, PM2 worker, in-app Anthropic SDK). The stage contracts in section 5 replace it.
- `.blog-content` has no table styles. Agent articles include tables and FAQs, so I will add blog-scoped table CSS
  that matches the current typography. This is a visual addition inside article bodies only.
- Featured images live in `public/assets/blog/` and only change on deploy. There is no upload storage.
- Author is "webmaster" or Organization. No real author or reviewer exists for E-E-A-T.
- **Neither of my sandboxes can reach Neon** (the network allowlist blocks it). Migrations will be run from your machine
  (or by Vercel build); I will test against PGlite + pgvector in-process.
- Housekeeping: my recon left a scratch file `.q.cjs` in the repo root. It contains no secrets; please delete it.

---

## 2. Decisions

### 2.1 Architecture (unchanged from the master prompt, tightened)

```
Cowork scheduled task (LLM stages, web research, skills)
        │  Streamable HTTP + OAuth 2.1
        ▼
/api/mcp  (Next.js route, mcp-handler)  ──►  Neon Postgres + pgvector  (system of record)
        │                                      ▲
        └─ embeddings provider (only external AI call)  │
/admin/blog-agent  (existing JWT auth) ────────┘  approve / publish / reject / delete
```

- The app never generates article text. No in-app Anthropic SDK, no worker, no queue service.
- No publish, approve, reject or delete capability over MCP. These exist only as admin Server Actions.
- Every tool call is a short, idempotent DB operation (target under 5 s; embeddings batched).

### 2.2 Proposed fixes, by scope

**Blog-only (included in the plan):** A, A2, B, B2 (sitemap blog query), caching/revalidation, HTML sanitising,
validation and CSRF on the blog admin API, read-time helper, BlogPosting JSON-LD clean-up, table CSS scoped to
`.blog-content`.

**Outside the blog (approved 2026-11-02):**
1. Footer: change `/services/${slug}` to `/${slug}` (href only, no visual change) and add
   `/services/:slug → /:slug` 301 redirects in `next.config.ts`.
2. Sitemap static list: `/corporate-web-design-company` → `/corporate-web-design-nigeria`.
3. Root layout: remove the global `alternates.canonical` (every page that needs one already sets its own).
   `/portfolio`, `/pricing`, `/graphics-design` and `/mobile-apps-development` currently inherit the homepage canonical too.
4. `SESSION_SECRET` fail-closed.
5. Admin SEO page: update the stale `/services/*` paths.

**Canonical service URL set (proposed):** the flat paths are canonical:
`/corporate-web-design-nigeria`, `/web-development-services`, `/search-engine-optimization-seo`,
`/ecommerce-web-development`, `/mobile-apps-development`, `/graphics-design`, `/website-maintenance-and-support`,
plus `/services` (hub), `/portfolio`, `/pricing`, `/contact-us`, `/about-the-web-design-company`.
Every `/services/<slug>` returns a 301 to `/<slug>`. These are the only service URLs seeded into `link_targets`.

### 2.3 Data layer

- **Drizzle ORM + drizzle-kit** for all new tables (the master prompt's rule when no ORM exists), using the Neon HTTP
  driver, plus the Neon WebSocket `Pool` (created per request) for the few multi-statement transactions.
  Existing raw-SQL code keeps working; blog code moves to Drizzle.
- Migrations: drizzle-kit SQL files with a matching `down` file each, tracked in a migrations table.
  `npm run db:migrate`, `db:rollback`, `db:seed`.
- **One content model:** new `articles` table (uuid). The 10 posts are backfilled with their `legacy_id`, slugs
  unchanged. `content_format` (`html` | `markdown`): legacy posts and the existing Quill editor stay `html`;
  agent articles are `markdown`. Both render through one pipeline that sanitises the output.
  `blog_posts` stays untouched as a rollback copy until you approve dropping it (not before Phase 5).
- Markdown pipeline: unified / remark-gfm / rehype-sanitize / rehype-slug. The same mdast tree powers the validators,
  deterministic link insertion, heading checks and the renderer, so there is one parser and no regex HTML surgery.

### 2.4 MCP authentication (checked against current Anthropic docs)

Claude custom connectors support **OAuth 2.0 with DCR or CIMD by default**. Static bearer headers are **beta, limited
to some organisations**, and are an organisation credential, not a person's.
`client_credentials` (machine-to-machine) is **not** supported.

**Plan:** implement a minimal, spec-compliant OAuth 2.1 authorisation server inside the app:
- `/.well-known/oauth-protected-resource` (RFC 9728) and `/.well-known/oauth-authorization-server` (RFC 8414).
  The 401 on `/api/mcp` carries `WWW-Authenticate: Bearer resource_metadata=…`.
- **CIMD** (advertises `client_id_metadata_document_supported: true` and `token_endpoint_auth_methods_supported:
  ["none"]`), with **DCR** fallback (`/oauth/register`). Client IDs are allowlisted to Claude's hosts.
- Authorisation code + **PKCE S256 only**. Consent screen = your existing admin login (only an `admin_users` account can approve).
- Redirect URIs: `https://claude.ai/api/mcp/auth_callback`, plus port-agnostic loopback for Claude Code.
- Short-lived access tokens (1 h), **rotating refresh tokens**, `invalid_grant` on reuse. All tokens SHA-256-hashed
  in DB. Single scope `blog_agent`. Revoke from the admin UI.
- Optional: also accept an `Authorization: Bearer <MCP_STATIC_TOKEN>` if your organisation has the header beta (off by default).
- Rate limit: Postgres fixed-window counter per client (no in-memory state). Every call is written to
  `mcp_call_log` (tool, client, duration, ok/error, run_id; inputs hashed, not stored raw).

### 2.5 Retrieval and embeddings (decided 2026-11-02)

Claude (Pro/Max/Cowork) cannot supply embeddings: Anthropic has no embeddings API, and a Claude subscription gives
the website no way to compute vectors. So retrieval is a pluggable `Retriever` with two modes, chosen by env var:

- **`lexical` (default, free, no API key):** Postgres full-text search (`tsvector`, weighted title > headings > body)
  plus `pg_trgm` keyword similarity. Tools return compact candidates (title, URL, summary, H2s, score), and **Claude in
  Cowork makes the semantic judgement** (cannibalisation verdict, link choice). With a site of tens to a few hundred
  articles this is accurate enough, and every final link is still verified server-side.
- **`vector` (later, optional):** pgvector + an embeddings provider (OpenAI `text-embedding-3-small` 1536 or Voyage
  `voyage-3.5` 1024). Switching on is: set the key, run `npm run agent:embed-backfill`, flip `RETRIEVAL_MODE=hybrid`.
  Approximate cost with OpenAI small: well under US$0.01 per article.

The `article_embeddings` table, migrations and `index_article` tool are still built, so nothing changes in the
Cowork workflow when vectors are switched on. In `lexical` mode `index_article` builds and verifies the search
document (`search_tsv` + section rows) instead of vectors, and keeps it non-searchable until publish.

### 2.6 Featured images (decided)

Admin uploads the image while reviewing the draft. Stored in **Vercel Blob** (`@vercel/blob`, server upload
via a Server Action, type/size checks, max 2 MB, webp/jpeg/png/avif). `next.config.ts` gains the Blob host in
`images.remotePatterns`. The agent supplies the image prompt and alt text. **Approve is blocked until a featured
image and alt text are set.** Legacy posts keep their `/assets/blog/*` paths.

### 2.7 Author (decided: named person)

`authors` table + Person JSON-LD (`name`, `jobTitle`, `url`, `sameAs`) and a visible byline inside the existing
article header text line (same style as the date/read-time line). Details pending from you; no author is invented.

---

## 3. Database schema (Postgres + pgvector)

```
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

| Table | Key columns / notes |
|---|---|
| `articles` | id uuid pk · legacy_id int null unique · title · slug unique · content text · content_format enum(html, markdown) · summary · primary_keyword · secondary_keywords jsonb · category · tags jsonb · status enum(draft, pending_review, published, rejected, archived) · meta_title · meta_description · og_title · og_description · featured_image · featured_image_alt · image_prompt · schema_jsonld jsonb · faq jsonb · references jsonb · qa_report jsonb · search_tsv tsvector (GIN) · word_count int · reading_minutes int · author_id · reviewer_id · run_id uuid null · canonical_override text null · created_at · updated_at · published_at. Indexes: (status, published_at desc), primary_keyword + title trigram (pg_trgm) |
| `article_embeddings` | id · article_id fk cascade · scope enum(full, intro, section, faq, meta) · section_key · model · dims · embedding vector(N) · content_hash · searchable bool default false · created_at. Unique (article_id, scope, section_key, model). HNSW (vector_cosine_ops) · partial index on searchable |
| `link_targets` | id · url unique · title · summary · type enum(service, portfolio, contact, category, pillar, page) · embedding vector(N) · model · is_active |
| `keyword_queue` | id · keyword unique (normalised) · priority int · status enum(queued, claimed, done, skipped, failed) · cluster_id · notes · claimed_at · claimed_by_run |
| `content_clusters` | id · name · pillar_keyword · pillar_article_id null · parent_cluster_id null · priority · notes |
| `pipeline_runs` | id uuid · keyword_id · keyword · status enum(running, needs_human, draft_created, failed, abandoned) · current_stage · error · embedding_cost_usd · started_at · finished_at · heartbeat_at |
| `pipeline_stage_outputs` | id · run_id · stage enum(s1…s11) · version int · output jsonb · input_hash · created_at. Unique (run_id, stage, version) |
| `authors` | id · name · role · bio · profile_url · same_as jsonb (E-E-A-T) |
| `audit_log` | id · actor (admin email or oauth client) · action · entity · entity_id · diff jsonb · ip · created_at |
| `oauth_clients`, `oauth_codes`, `oauth_tokens` | hashed secrets/tokens, expiry, revoked_at |
| `mcp_call_log`, `rate_limits` | see 2.4 |
| `admin_users` (+ column) | `role text not null default 'admin'` |

Vector search always filters `articles.status = 'published' AND article_embeddings.searchable = true`, plus `link_targets.is_active`.
The **cannibalisation check additionally looks at `pending_review` drafts and the keywords of in-flight runs**, so two drafts cannot target the same keyword.

Seeds: brand context (`src/lib/blog-agent/brand/johnnybits.ts`, typed and Zod-validated), `link_targets` from the
canonical service set plus `/portfolio`, `/contact-us`, `/services`, `/blog`; backfill of the 10 posts; embeddings
backfill job (`npm run agent:embed-backfill`, resumable, batched).

---

## 4. MCP tools

All tools: Zod input **and** output schemas, `dry_run` flag, structured errors `{code, message, hint}`, audit + rate limit.

| Tool | Notes / changes vs master prompt |
|---|---|
| `get_brand_context` | Company facts, canonical service URLs, tone, **approved claims (empty until you verify them)**, banned claims (all figures in 1.3 D/E), CTAs (`/contact-us`, WhatsApp), real portfolio projects (names + URLs from `brand.ts` only), authors |
| `search_site_content(query, k)` | **New.** Read-only semantic search over published content and link targets, for S2 placement and the S3 brief (the master prompt had no way to see existing targets before the article exists) |
| `enqueue_keywords(items[])` / `save_cluster_plan(plan)` | **New**, for the S2 batch planner. Adding keywords is safe, so it is allowed; priorities are capped |
| `claim_next_keyword` | Single statement `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING`. Stale claims (> 6 h, no heartbeat) are released |
| `create_run(keyword_id)` / `get_run(run_id)` | `get_run` returns the latest version of every stage plus the next expected stage, for resume |
| `save_stage_output(run_id, stage, output)` | Per-stage Zod schema; new version per save; enforces stage order |
| `check_cannibalization(run_id)` | Embedding similarity + normalised keyword overlap → `{verdict: ok | update_existing | block, matches[]}` |
| `find_link_candidates(run_id)` | Embeds the saved S6 draft; top 20 across published articles and link targets |
| `apply_internal_links(run_id, links[])` | Deterministic mdast insertion. Checks: URL in DB; anchor appears verbatim **once** in the cited sentence; not in a heading, existing link, code or FAQ question; count within range for word count (1 per ~250 words, min 3, max 10); no repeated exact-match anchors; no self-link; at least 1 service/CTA link |
| `build_seo_package(run_id, fields)` | Takes the LLM's SEO fields; computes unique slug, JSON-LD (BlogPosting, BreadcrumbList, Organization ref, FAQPage behind `AGENT_FAQ_SCHEMA` flag), Flesch reading ease, keyword density, title/description lengths |
| `validate_article(run_id)` | Heading hierarchy (one H1 in the title only; no skipped levels; no duplicate headings), word count ±15% of brief, zero `[[NEEDS_SOURCE]]`, **every sentence containing a number/%/₦/$ carries a citation `[^n]` that maps to a saved S4 research item**, references list complete, links valid, schema ⇔ content consistency (FAQ text identical, headline = title), banned-claim scan |
| `report_failure(run_id, stage, report)` | **New.** Sets run status to `needs_human` with the report, so the admin timeline shows why it stopped |
| `index_article(run_id)` | Embeddings for full, intro, each H2, FAQ, meta; reuses S8 embeddings when `content_hash` matches; verifies the count and article id; `searchable=false` |
| `create_draft(run_id)` | Refuses unless validation passed on the **current** content hash, the S9 report is PASS on the same hash, and indexing is verified on the same hash → creates the `pending_review` article |

No publish, approve, reject or delete tool exists or will be added.

---

## 5. Stage contracts (replace the missing 11-stage spec)

| Stage | Runs in | Output (Zod) |
|---|---|---|
| S1 Keyword intelligence | Cowork skill | intent, audience, locale (Nigeria-specific?), SERP features, secondary keywords, content type, target word count |
| S2 Cluster planner | Cowork skill (batch task monthly; placement per run) | pillar/child placement, sibling articles |
| S3 Brief | Cowork skill | angle, H2 plan, E-E-A-T notes, Johnnybits experience angles **from brand context only**, required internal targets (from `search_site_content`), CTA |
| S4 Research | Cowork (web search/fetch) | items[]: id, claim, type(fact, statistic, opinion), source_url, publisher, date, confidence, quote ≤ 25 words |
| S5 Outline | Cowork skill | markdown; must contain FAQ, at least one table, a CTA placement, no duplicate headings |
| S6 Writer | Cowork skill | markdown with `[^n]` citations + references; `[[NEEDS_SOURCE]]` where unsupported |
| S7 SEO fields | Cowork skill → `build_seo_package` | titles, descriptions, OG/Twitter, image prompt, alt text, tags, category |
| S8 Linking | Cowork skill → `apply_internal_links` | link picks with sentence + anchor |
| S9 Editorial QA | Separate Cowork sub-agent + `validate_article` | PASS/FAIL + exact revisions; max 2 loops, then `report_failure` |
| S10 Indexing | App (`index_article`) | verification report |
| S11 CMS draft | App (`create_draft`) | article id, admin review URL |

---

## 6. Admin UI `/admin/blog-agent` (existing shell, shadcn components, no new design language)

- **Queue:** add keywords (single or bulk paste), priority, skip, re-queue.
- **Runs:** timeline per run (stage, version, JSON viewer, errors, timestamps, embedding cost), mark abandoned, re-queue.
- **Drafts:** list → sanitised preview using the real `.blog-content` styles; edit content, SEO fields, featured image,
  and links (list of inserted links with remove/edit, which re-runs the link validator); QA report panel.
- **Approve & publish** (one Server Action, in a transaction): status `published`, `published_at`, embeddings
  `searchable=true`, canonical = own URL, `revalidatePath('/blog')`, `revalidatePath('/blog/[slug]','page')`,
  `revalidatePath('/sitemap.xml')`, audit log. **Reject** (reason required) · **Delete** (rejected only).
- **Connector:** list OAuth clients and tokens, revoke.
- Security: admin role check in every action, Server Action origin check + double-submit CSRF token for route handlers,
  audit log on all mutations.
- The existing `/admin/blog` editor is switched to the `articles` table with no visible change, and gains revalidation.

---

## 7. File tree (new or changed)

```
drizzle.config.ts
drizzle/                       # SQL migrations + down files
.env.example
vitest.config.ts
src/db/schema/*.ts             # Drizzle schema
src/db/client.ts
src/lib/blog/                  # public blog: queries, render (unified), read-time, metadata, jsonld
src/lib/blog-agent/
  brand/johnnybits.ts
  schemas/                     # Zod per stage + per tool
  embeddings/                  # provider interface, openai|voyage, fixture
  vector/                      # pgvector queries
  linking/                     # mdast link insertion + rules
  seo/                         # slug, jsonld, readability, density
  qa/                          # validators
  runs/                        # run/stage service, claim logic
  mcp/                         # tool registry, auth, rate limit, logging
  oauth/                       # AS endpoints logic, PKCE, CIMD/DCR
src/app/api/mcp/[transport]/route.ts
src/app/.well-known/oauth-protected-resource/route.ts
src/app/.well-known/oauth-authorization-server/route.ts
src/app/oauth/{authorize,token,register,revoke}/…
src/app/(admin)/admin/blog-agent/**   # queue, runs, drafts, connector
src/app/(frontend)/blog/page.tsx      # data + metadata only; markup unchanged
src/app/(frontend)/blog/[slug]/page.tsx
src/app/sitemap.xml/route.ts          # blog query fix
src/app/api/admin/blog/**             # → articles + zod + revalidate
src/scripts/agent/*.ts                # backfill, seed, embed-backfill
tests/** (unit + integration with PGlite/pgvector fixtures)
docs/blog-agent.md                    # README section
```

New dependencies: `drizzle-orm`, `drizzle-kit`, `mcp-handler`, `@modelcontextprotocol/sdk` (pin the version
compatible with zod 4), `unified` / `remark-*` / `rehype-*`, `vitest`, `@electric-sql/pglite` (dev).

## 8. Env vars (`.env.example`)

`DATABASE_URL` (pooled) · `DATABASE_URL_UNPOOLED` (migrations) · `SESSION_SECRET` (required) · `NEXT_PUBLIC_SITE_URL` ·
`RETRIEVAL_MODE` (lexical | hybrid) · `BLOB_READ_WRITE_TOKEN` · `EMBEDDINGS_PROVIDER` (none | openai | voyage | fixture) · `OPENAI_API_KEY` or `VOYAGE_API_KEY` · `EMBEDDINGS_MODEL` · `EMBEDDINGS_DIMS` ·
`OAUTH_ISSUER` (https://johnnybits.com) · `OAUTH_ALLOWED_CLIENT_HOSTS` (claude.ai,claude.com) · `MCP_STATIC_TOKEN` (optional) ·
`MCP_RATE_LIMIT_PER_MIN` · `AGENT_DRY_RUN` · `AGENT_FAQ_SCHEMA`

---

## 9. Changes to the original prompts

1. **MySQL / PM2 worker / in-app Anthropic SDK (blog-agent-spec.md) dropped.** The site is Vercel + Neon, and Cowork runs the LLM stages.
2. **Token auth → OAuth 2.1 (CIMD + DCR).** Static headers are beta and limited; OAuth works in Cowork by default.
3. **Embedding dimension is configurable.** 1536 rules out Voyage.
4. **Added tools:** `search_site_content`, `enqueue_keywords`, `save_cluster_plan`, `report_failure`. Without them S2, S3 and the "stop and report" rule had no tool path.
5. **Cannibalisation also covers pending drafts and in-flight runs.**
6. **Gating is bound to a content hash**, so editing after QA forces re-validation.
7. **Statistic traceability is defined mechanically** (`[^n]` → research item id).
8. "Update the in-memory index" removed (serverless). The sitemap is revalidated rather than "updated".
9. **Content model keeps legacy HTML** (`content_format`) instead of lossy HTML→markdown conversion of the 10 posts.
10. The Cowork task prompt gains: brand-context caching per session, a `report_failure` call on every stop, `dry_run` for the first runs, and an admin review URL in the final report.

## 10. Phases and estimates

| Phase | Content | Est. |
|---|---|---|
| 0 | This plan | done |
| 1 | Blog SEO fixes (A, A2, B, B2, caching), Drizzle + migrations, `articles` backfill, `link_targets` seed, embeddings provider, brand file, test harness | 1.5–2 days |
| 2 | OAuth AS + `/api/mcp` + run/queue/stage tools, rate limit, logging | 2 days |
| 3 | Linking, SEO package, validators, indexing, `create_draft` gating | 1.5–2 days |
| 4 | `/admin/blog-agent` + publish flow; existing admin switched to `articles` | 2 days |
| 5 | Hardening, unit + integration tests, docs, drop-`blog_posts` decision | 1 day |
| 6 | Cowork: 8 stage skills, connector setup, scheduled task (on demand first), 3 supervised runs | 0.5–1 day |

Each phase: lint, typecheck, tests, then a stop with what changed, how to test, and open questions.
Work happens on branch `feature/blog-agent`; nothing is pushed or deployed without your go-ahead.
Migrations run on a **Neon branch** first (you run them from your machine; my sandboxes cannot reach Neon).

## 11. Risks

- The OAuth AS is the largest piece of security-sensitive code. Mitigation: PKCE-only, hashed tokens, short expiry,
  rotation, Claude-host allowlist, admin-only consent, tests for every error path.
- `mcp-handler` / MCP SDK / zod 4 version compatibility: verified at the start of Phase 2, pinned.
- Neon HTTP driver has no interactive transactions: the WebSocket `Pool` is used for approve/claim paths.
- Cowork scheduled runs and the connector's token refresh: validated in Phase 6 with on-demand runs before scheduling.
- Thin existing posts (~275 words) will rank poorly as link targets. The agent can recommend updates (S1 `update_existing` verdict).

## 12. Decisions and open questions

Decided 2026-11-02: retrieval `lexical` now, vectors later (2.5) · featured images via admin upload to Vercel Blob (2.6) ·
all non-blog fixes in 2.2 approved · articles credited to a named person (2.7).

Still open:
1. Author (and optional reviewer): name, job title, short bio, profile URL (LinkedIn/X).
2. Which marketing figures, if any, are verified and may go on the approved-claims list (1.3 D)?
3. Approval to start Phase 1.


## 13. Phase 1 deviations from this plan

- Retrieval table is named `article_chunks` (not `article_embeddings`): one row per full/intro/section/FAQ/meta unit,
  with both a generated `search_tsv` and a nullable dimension-free `embedding`. The HNSW index is created per
  model/dimension when vectors are switched on.
- No drizzle-kit: migrations are hand-written `NNNN_name.up.sql` / `.down.sql` pairs (truly reversible) applied by
  `src/db/migrator.ts`; `tests/db/migrations.test.ts` checks the Drizzle schema matches the SQL column-for-column.
- `references` column is named `citations` (`references` is a reserved word in SQL).
- `SESSION_SECRET` hard minimum is 16 characters (warning below 32), because the current secrets are 25–26 characters.
  Rotate to 32+ (`openssl rand -base64 32`); the only effect is a re-login.
- Legacy posts have no author (`author_id` null) and keep Organization as JSON-LD author; agent articles use Odoh John.
- CSRF on the legacy admin API uses an Origin/Referer check with the existing SameSite=Lax cookie (OWASP "verify origin").

## 14. Phase 2 deviations from this plan

- MCP server uses `mcp-handler` 2.3 on the MCP SDK v2 (`@modelcontextprotocol/server` 2.4), the maintained line that
  supports zod 4 and the 2026-07-28 protocol with a 2025-era fallback.
- `claim_next_keyword` claims **and** creates the run in one statement (a claim can never exist without a run), and
  resumes the calling connection's open run. `create_run` takes a keyword string for ad-hoc runs.
- `save_stage_output` binds `s9_qa` to the content hash of the draft it reviewed (set server-side), supports
  `validate_only`, and refuses `s3_brief` until `check_cannibalization` has run without a `block`.
- Cannibalization also flags other in-flight runs and drafts awaiting review, not only published articles.
- Draft citations are checked mechanically at save time: every `[^rN]` must be a saved research id, have a definition,
  and that definition must link to the research item's exact `source_url`.
- Consent screen lives in the admin (`/admin/connector/authorize/{id}`); the admin login now returns you to the page
  you came from (`?next=`, admin paths only).
- A minimal `/admin/blog-agent/connections` page (connector URL, connections with revoke, recent tool calls) ships now
  because revocation must exist as soon as the connector does; the full agent admin is still Phase 4.
- Existing posts are credited to Odoh John (byline + Person JSON-LD with LinkedIn `sameAs`); `updated_at` is preserved.
