# Claude Code Master Prompt: Johnnybits Blog Agent (Next.js + Neon Postgres + MCP)

**How to use**
1. Save your original 11-stage spec in the repo as `docs/blog-agent-spec.md`.
2. Open Claude Code in the repo root, start in plan mode, and paste everything below the line.
3. Review each phase before telling Claude Code to continue.

---

# Task: Build the backend, MCP connector and admin UI for the Johnnybits Blog Agent

You are a senior full-stack engineer working in the existing repository for https://johnnybits.com
(Johnnybits Technology, Ibadan/Lagos, Nigeria: web development, SEO, mobile apps, e-commerce, SaaS).
Stack: Next.js on Vercel, Neon PostgreSQL. The spec for the 11 stages is `docs/blog-agent-spec.md`.
This prompt overrides the spec wherever they conflict.

## Architecture

Claude Cowork runs the LLM stages (a scheduled task plus skills). THIS app is a secure tool server and the
system of record. Cowork calls the app through a remote MCP server. The app never calls an LLM to generate
articles. The only external AI call the app makes is for embeddings (provider interface, Voyage or OpenAI,
1536 dimensions, API key in env vars).

## Rules

- Start in plan mode. Phase 0 is recon plus a written plan, with no code. Stop after every phase for my review.
- Reuse the existing ORM, auth, UI kit and conventions. If there is no ORM, use Drizzle with
  `@neondatabase/serverless` and the pooled connection string.
- Serverless-safe: no long-running processes, no in-memory state across requests, every tool call finishes in
  roughly 10 seconds or less.
- Never expose a publish, approve or delete capability through MCP. Publishing happens only in the admin UI,
  by an authenticated admin.
- Never invent URLs, statistics, quotes, client names or case studies.
- Secrets only in env vars. Maintain `.env.example`.

## Database (Neon, pgvector)

Run `CREATE EXTENSION IF NOT EXISTS vector;` and provide reversible migrations. Tables:

- `articles`: uuid id, title, slug (unique), content (markdown), summary, primary_keyword,
  secondary_keywords jsonb, category, tags jsonb, status enum
  (draft | pending_review | published | rejected | archived), meta_title, meta_description,
  schema_jsonld jsonb, faq jsonb, qa_report jsonb, run_id, created_at, updated_at, published_at.
- `article_embeddings`: article_id, scope (full | intro | section | faq | meta), section_key, model,
  embedding vector(1536), content_hash, searchable boolean default false, with an HNSW cosine index.
- `link_targets`: non-article pages (services, portfolio, contact, categories, pillars): url, title, summary,
  type, embedding vector(1536), is_active.
- `keyword_queue` (keyword, priority, status, notes), `content_clusters` (pillar/child relationships, priority),
  `pipeline_runs`, `pipeline_stage_outputs` (run_id, stage, output jsonb, version, created_at), `audit_log`.
- Backfill the existing blog posts into `articles` and seed `link_targets` from the service pages.
  Do not break existing URLs.
- Vector search returns only `status='published' AND searchable=true` articles plus active `link_targets`.

## MCP server

Implement a Streamable HTTP MCP route in the Next.js app (for example `/api/mcp`) using the maintained
TypeScript MCP adapter for Next.js/Vercel. Before choosing auth, check current Anthropic documentation for the
auth methods supported by Claude custom connectors (OAuth vs token) and implement the strongest supported one.
Rate-limit and log every call. Validate all inputs and outputs with Zod.

Tools:

| Tool | Behaviour |
|---|---|
| `get_brand_context` | Company facts, services with canonical URLs, tone, approved claims, banned claims, CTAs, real portfolio projects usable as examples |
| `claim_next_keyword` | Atomically claims the next queued keyword (`FOR UPDATE SKIP LOCKED`) |
| `create_run(keyword)` | Creates a pipeline run and returns `run_id` |
| `get_run(run_id)` | Returns all saved stage outputs, so a dead session can resume |
| `save_stage_output(run_id, stage, json)` | Per-stage Zod schema; rejects invalid output with a clear error |
| `check_cannibalization(keyword)` | Embedding similarity plus keyword overlap against existing published content |
| `find_link_candidates(run_id)` | Embeds the saved article server-side, returns the top 20 from published articles and `link_targets` via pgvector |
| `apply_internal_links(run_id, links[])` | Server verifies each URL exists in the DB, the anchor text exists verbatim in the stated sentence, the link count is within range for the word count, anchors are not repeated exact-match, and no links sit in headings. Inserts links deterministically |
| `build_seo_package(run_id)` | Unique slug, JSON-LD (Article, BreadcrumbList, Organization, FAQPage behind a config flag), readability score, keyword density |
| `validate_article(run_id)` | Heading hierarchy, word count vs brief, unresolved `[[NEEDS_SOURCE]]` markers, every statistic traceable to saved research, link validity, schema/content consistency |
| `index_article(run_id)` | Embeddings for full article, intro, each H2, FAQ and meta description; verifies storage; keeps `searchable=false` |
| `create_draft(run_id)` | Refuses unless validation passed, the QA report is PASS and indexing is verified; then creates the article as `pending_review` |

Provide a `dry_run` mode and fixtures so everything can be tested without paid API calls.
Do NOT create any publish, approve, reject or delete tool.

## Admin UI (`/admin/blog-agent`, protected by existing auth)

- Keyword queue management, with an option to add keywords and set priority.
- Run timeline showing each stage output, errors and timestamps.
- Draft list, markdown preview, edit content and SEO fields, edit or remove internal links.
- Approve and publish, reject, delete rejected articles.
- Approve does all of: set status `published`, set embeddings `searchable=true`, `revalidatePath` for the post
  and `/blog`, update the sitemap, set canonical to the article's own URL.
- CSRF protection on mutations, admin-only role check, audit log of admin actions.

## Quality bar

- TypeScript strict. Zod at every boundary. No `any` without an explanatory comment.
- Unit tests for link insertion and validation, slug and JSON-LD generation, validators, the vector query and
  the stage schemas.
- Integration test of the full tool sequence using fixtures.
- README section covering env vars, how to add the connector in Cowork, rotating tokens and recovering a failed run.

## Phases

0. Recon and plan.
1. Schema, migrations, backfill, `link_targets` seed, embeddings provider.
2. MCP server and tools.
3. Validators, SEO package, `create_draft` gating.
4. Admin UI and publish flow.
5. Hardening, tests, docs.

Stop after each phase with: what changed, how to test it, open questions.

## Phase 0 must also report

- Where blog posts are stored today (DB, MDX or hardcoded) and how they are rendered and revalidated.
- That `/blog` declares its canonical (and `og:url`) as `https://johnnybits.com` instead of its own URL.
- That every existing post shows a "1 min" read time (broken calculation or very thin content).
- That service URLs appear both as `/web-development-services` and `/services/web-development-services`.
  Propose the canonical set and a redirect plan.
- Marketing figures on the site (for example traffic growth, PageSpeed score, ratings) that must not be reused
  by the agent unless verified and added to the approved-claims list.
