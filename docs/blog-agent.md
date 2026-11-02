# Blog agent — setup and operations

Design and decisions: [`blog-agent-plan.md`](./blog-agent-plan.md). This file is the runbook.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Recon and plan | Done |
| 1 | Blog SEO fixes, `articles` model, migrations, backfill, link targets, retrieval, brand context, tests | **Done, awaiting review** |
| 2 | OAuth + `/api/mcp` + run/queue/stage tools | Not started |
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
