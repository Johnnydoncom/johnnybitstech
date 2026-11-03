import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import { audit } from "@/lib/audit";
import { isUniqueViolation } from "@/lib/blog/admin";
import { contentStats } from "@/lib/blog/text";
import { getBrandContext } from "../brand/johnnybits";
import { contentHash } from "../hash";
import { buildChunks, type Chunk } from "../indexing/chunks";
import { existingInternalLinks, insertLinks, linkCountRange, type TargetType } from "../linking/insert";
import { headings, parseMarkdown } from "../markdown";
import { validateArticle, type ValidationReport } from "../qa/validate";
import { searchSiteContent, type SiteSearchHit } from "../retrieval/lexical";
import { fuseRankings, vectorSearch } from "../retrieval/vector";
import type { s1KeywordSchema, s3BriefSchema, s4ResearchSchema, s6DraftSchema, s7SeoSchema, s8LinksSchema, s9QaSchema } from "../schemas/stages";
import { buildSeoPackage, type SeoPackage } from "../seo/package";
import { uniqueSlug } from "../seo/slug";
import { existingSitePaths } from "./stage-checks";
import { assertRunning, insertStageOutput, latestStages, loadRun, nextStage, requireStage, savedAt, touchRun, type StageMap } from "./run-store";
import { defineTool, normalizeKeyword, ToolError, type ToolContext } from "./types";

type Out<T extends z.ZodType> = z.output<T>;
const runIdInput = z.object({ run_id: z.string().uuid() });
const issue = z.object({ path: z.string(), message: z.string() });

type Applied = { title: string; markdown: string; applied: { url: string; anchor_text: string; offset: number }[]; source_draft_hash: string; links_version: number };
type IndexOutput = { chunk_count: number; chunks: (Chunk & { embedding?: number[] })[]; embedding_model: string | null; embedding_dims: number | null; verified: boolean };

async function loadRunning(ctx: ToolContext, runId: string) {
  const run = await loadRun(ctx.db, runId);
  assertRunning(run);
  return { run, saved: await latestStages(ctx.db, run.id) };
}

/** The linked draft, only if it was built from the latest draft and latest link picks. */
function currentApplied(saved: StageMap) {
  const draft = requireStage(saved, "s6_draft", "Save the draft first");
  const links = saved.get("s8_links");
  const applied = saved.get("s8_applied");
  if (!applied || !links) throw new ToolError("invalid_state", "Internal links have not been applied", "Save s8_links, then call apply_internal_links");
  if ((applied.output as Applied).source_draft_hash !== draft.content_hash || savedAt(applied) < savedAt(links)) {
    throw new ToolError("invalid_state", "The draft or link picks changed after links were applied", "Call apply_internal_links again");
  }
  return applied;
}

function currentPackage(saved: StageMap, applied: { content_hash: string | null }) {
  const pkg = saved.get("s7_package");
  if (!pkg || pkg.content_hash !== applied.content_hash || savedAt(pkg) < savedAt(saved.get("s7_seo"))) {
    throw new ToolError("invalid_state", "The SEO package is missing or out of date", "Call build_seo_package");
  }
  return pkg;
}

function currentValidation(saved: StageMap, applied: { content_hash: string | null }) {
  const validation = saved.get("s9_validation");
  if (!validation || validation.content_hash !== applied.content_hash || savedAt(validation) < savedAt(saved.get("s7_package"))) {
    throw new ToolError("invalid_state", "The article has not been validated in its current form", "Call validate_article");
  }
  return validation;
}

/** Type of every linkable URL among those given: "article" for published posts, else the link target type. */
async function linkTargetTypes(ctx: ToolContext, urls: readonly string[]): Promise<Map<string, TargetType>> {
  if (!urls.length) return new Map();
  const rows = rowsOf<{ url: string; type: TargetType }>(
    await ctx.db.execute(sql`
      SELECT '/blog/' || slug AS url, 'article' AS type FROM articles WHERE status = 'published' AND '/blog/' || slug IN ${[...urls]}
      UNION
      SELECT url, type::text AS type FROM link_targets WHERE is_active AND url IN ${[...urls]}
    `),
  );
  return new Map(rows.map((r) => [r.url, r.type]));
}

async function addEmbeddingCost(ctx: ToolContext, runId: string, usd: number) {
  if (usd > 0) await ctx.db.execute(sql`UPDATE pipeline_runs SET embedding_cost_usd = embedding_cost_usd + ${usd}::numeric WHERE id = ${runId}`);
}

// ---------------------------------------------------------------------------

const candidate = z.object({ url: z.string(), title: z.string(), summary: z.string(), type: z.string(), score: z.number() });

export const findLinkCandidates = defineTool({
  name: "find_link_candidates",
  title: "Find internal link candidates for the draft",
  description:
    "Searches published articles and site pages related to the saved draft (lexical, plus vector search when embeddings are enabled) " +
    "and always includes the service, portfolio and contact pages. Pick links from these candidates only, then save s8_links " +
    "and call apply_internal_links. Also returns the link-count range for this draft's length.",
  input: runIdInput,
  output: z.object({
    candidates: z.array(candidate),
    retrieval: z.enum(["lexical", "hybrid"]),
    link_rules: z.object({ word_count: z.number(), min_links: z.number(), max_links: z.number(), existing_internal_links: z.number(), rules: z.array(z.string()) }),
  }),
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx, input) {
    const { run, saved } = await loadRunning(ctx, input.run_id);
    const draft = requireStage(saved, "s6_draft", "Save the draft (s6_draft) first").output as Out<typeof s6DraftSchema>;
    const s1 = saved.get("s1_keyword")?.output as Out<typeof s1KeywordSchema> | undefined;
    const h2s = headings(parseMarkdown(draft.markdown)).filter((h) => h.depth === 2).map((h) => h.text);
    const query = [s1?.primary_keyword, ...(s1?.secondary_keywords ?? []).slice(0, 5), draft.title, ...h2s].filter(Boolean).join(" ");

    let hits: SiteSearchHit[] = await searchSiteContent(ctx.db, query, { limit: 20 });
    let retrieval: "lexical" | "hybrid" = "lexical";
    if (ctx.agentEnv.RETRIEVAL_MODE === "hybrid" && ctx.embeddings) {
      const embedded = await ctx.embeddings.embed([query], "query");
      await addEmbeddingCost(ctx, run.id, embedded.costUsd);
      const byVector = await vectorSearch(ctx.db, embedded.vectors[0], ctx.embeddings.model, 20);
      hits = fuseRankings([hits, byVector], 20);
      retrieval = "hybrid";
    }

    const conversion = rowsOf<{ url: string; title: string; summary: string; type: string }>(
      await ctx.db.execute(sql`SELECT url, title, summary, type::text AS type FROM link_targets WHERE is_active AND type IN ('service', 'portfolio', 'contact') ORDER BY type, title`),
    );
    const seen = new Set(hits.map((h) => h.url));
    const candidates = [
      ...hits.map((h) => ({ url: h.url, title: h.title, summary: h.summary.slice(0, 300), type: h.type, score: h.score })),
      ...conversion.filter((c) => !seen.has(c.url)).map((c) => ({ ...c, summary: c.summary.slice(0, 300), score: 0 })),
    ];

    const { wordCount } = contentStats(draft.markdown, "markdown");
    const { min, max } = linkCountRange(wordCount);
    await touchRun(ctx.db, run.id);
    return {
      candidates,
      retrieval,
      link_rules: {
        word_count: wordCount,
        min_links: min,
        max_links: max,
        existing_internal_links: existingInternalLinks(draft.markdown, ctx.siteOrigin).length,
        rules: [
          "Only URLs from this list",
          "Each URL at most once; never repeat an anchor text",
          "Anchor text copied verbatim from a unique sentence in the latest draft; plain text, not inside bold/italic, a heading, a footnote or an existing link",
          "Descriptive anchors, never 'click here'",
          "At least one service, portfolio or contact link",
        ],
      },
    };
  },
});

export const applyInternalLinks = defineTool({
  name: "apply_internal_links",
  title: "Insert the chosen internal links",
  description:
    "Inserts the links saved in s8_links into the latest draft, deterministically. Every rule is checked first (real page, verbatim " +
    "anchor in a unique sentence, link-count range, no repeats, not in headings/footnotes/existing links, at least one service/contact link). " +
    "On validation_failed nothing is changed: fix s8_links, save it again and retry.",
  input: runIdInput,
  output: z.object({ links_inserted: z.number(), links: z.array(z.object({ url: z.string(), anchor_text: z.string() })), content_hash: z.string(), next_stage: z.string() }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx, input) {
    const { run, saved } = await loadRunning(ctx, input.run_id);
    const draftRecord = requireStage(saved, "s6_draft", "Save the draft first");
    const linksRecord = requireStage(saved, "s8_links", "Call find_link_candidates, then save s8_links");
    if (savedAt(linksRecord) < savedAt(draftRecord)) {
      throw new ToolError("invalid_state", "s8_links was saved for an older draft", "Pick links again for the latest draft and save s8_links");
    }
    const draft = draftRecord.output as Out<typeof s6DraftSchema>;
    const picks = (linksRecord.output as Out<typeof s8LinksSchema>).links;
    const { wordCount } = contentStats(draft.markdown, "markdown");
    const targets = await linkTargetTypes(ctx, [...picks.map((l) => l.url), ...existingInternalLinks(draft.markdown, ctx.siteOrigin)]);

    const result = insertLinks(draft.markdown, picks, targets, { wordCount, siteOrigin: ctx.siteOrigin });
    if (!result.ok) throw new ToolError("validation_failed", `Links could not be applied (${result.errors.length} issue(s))`, "Fix s8_links, save it again, then retry", { issues: result.errors });

    const hash = contentHash(draft.title, result.markdown);
    const output: Applied = { title: draft.title, markdown: result.markdown, applied: result.applied, source_draft_hash: draftRecord.content_hash!, links_version: linksRecord.version };
    await insertStageOutput(ctx.db, run.id, "s8_applied", output, hash);
    await touchRun(ctx.db, run.id, "s8_applied");
    saved.set("s8_applied", { stage: "s8_applied", version: 0, output, content_hash: hash, created_at: new Date() });
    return { links_inserted: result.applied.length, links: result.applied.map(({ url, anchor_text }) => ({ url, anchor_text })), content_hash: hash, next_stage: nextStage(saved, run) };
  },
});

export const buildSeoPackageTool = defineTool({
  name: "build_seo_package",
  title: "Build the SEO package",
  description:
    "From s7_seo and the linked draft, computes the unique slug, canonical URL, JSON-LD (BlogPosting, BreadcrumbList, Organization, " +
    "FAQPage when enabled), word count, reading time, Flesch reading ease and keyword density/placement. Warnings are advisory; " +
    "validate_article enforces the hard rules.",
  input: runIdInput,
  output: z.object({
    slug: z.string(),
    canonical: z.string(),
    metrics: z.record(z.string(), z.unknown()),
    warnings: z.array(issue),
    next_stage: z.string(),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx, input) {
    const { run, saved } = await loadRunning(ctx, input.run_id);
    const applied = currentApplied(saved);
    const seo = requireStage(saved, "s7_seo", "Save s7_seo first").output as Out<typeof s7SeoSchema>;
    const s1 = requireStage(saved, "s1_keyword", "Save s1_keyword first").output as Out<typeof s1KeywordSchema>;
    const s3 = requireStage(saved, "s3_brief", "Save s3_brief first").output as Out<typeof s3BriefSchema>;
    const linked = applied.output as Applied;

    const [author] = rowsOf<{ name: string; slug: string; job_title: string | null; url: string | null; same_as: string[] }>(
      await ctx.db.execute(sql`SELECT name, slug, job_title, url, same_as FROM authors WHERE slug = ${s3.eeat.author_slug}`),
    );
    const slug = await uniqueSlug(ctx.db, seo.slug_suggestion);
    const pkg = buildSeoPackage({
      title: linked.title,
      markdown: linked.markdown,
      primaryKeyword: s1.primary_keyword,
      seo,
      slug,
      author: author ? { name: author.name, slug: author.slug, jobTitle: author.job_title, url: author.url, sameAs: author.same_as } : null,
      includeFaq: ctx.agentEnv.AGENT_FAQ_SCHEMA,
    });
    const warnings = [...pkg.warnings];
    if (slug !== seo.slug_suggestion) warnings.push({ path: "slug_suggestion", message: `"${seo.slug_suggestion}" is taken; using "${slug}"` });

    await insertStageOutput(ctx.db, run.id, "s7_package", { ...pkg, warnings }, applied.content_hash);
    await touchRun(ctx.db, run.id, "s7_package");
    saved.set("s7_package", { stage: "s7_package", version: 0, output: pkg, content_hash: applied.content_hash, created_at: new Date() });
    return { slug, canonical: pkg.canonical, metrics: pkg.metrics, warnings, next_stage: nextStage(saved, run) };
  },
});

export const validateArticleTool = defineTool({
  name: "validate_article",
  title: "Validate the final article",
  description:
    "Hard checks on the linked article and SEO package: heading hierarchy, word count vs the brief, no [[NEEDS_SOURCE]], every figure " +
    "cited to saved research, citations link their exact sources, only research sources as external links, internal links exist and are " +
    "in range, no banned claims, no keyword stuffing, FAQ schema matches the visible FAQ, JSON-LD matches the article. " +
    "passed=false lists exact problems: revise the draft (s6) or the SEO fields (s7), re-run the steps get_run reports, and validate again.",
  input: runIdInput,
  output: z.object({ passed: z.boolean(), errors: z.array(issue), warnings: z.array(issue), metrics: z.record(z.string(), z.unknown()), next_stage: z.string() }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx, input) {
    const { run, saved } = await loadRunning(ctx, input.run_id);
    const applied = currentApplied(saved);
    const pkgRecord = currentPackage(saved, applied);
    const linked = applied.output as Applied;
    const s1 = requireStage(saved, "s1_keyword", "Save s1_keyword first").output as Out<typeof s1KeywordSchema>;
    const s3 = requireStage(saved, "s3_brief", "Save s3_brief first").output as Out<typeof s3BriefSchema>;
    const s4 = requireStage(saved, "s4_research", "Save s4_research first").output as Out<typeof s4ResearchSchema>;
    const seo = requireStage(saved, "s7_seo", "Save s7_seo first").output as Out<typeof s7SeoSchema>;

    const internal = existingInternalLinks(linked.markdown, ctx.siteOrigin).map((u) => (u.startsWith("/") ? u : new URL(u).pathname));
    const report: ValidationReport = validateArticle({
      title: linked.title,
      markdown: linked.markdown,
      wordCountTarget: s3.word_count_target,
      primaryKeyword: s1.primary_keyword,
      research: s4.items,
      seo,
      pkg: pkgRecord.output as SeoPackage,
      siteOrigin: ctx.siteOrigin,
      existingPaths: await existingSitePaths(ctx.db, internal),
      bannedClaims: getBrandContext().bannedClaims,
    });

    await insertStageOutput(ctx.db, run.id, "s9_validation", report, applied.content_hash);
    await touchRun(ctx.db, run.id, "s9_validation");
    saved.set("s9_validation", { stage: "s9_validation", version: 0, output: report, content_hash: applied.content_hash, created_at: new Date() });
    return { ...report, next_stage: nextStage(saved, run) };
  },
});

export const indexArticle = defineTool({
  name: "index_article",
  title: "Index the validated article",
  description:
    "Builds the retrieval units (full text, intro, each H2 section, FAQ, meta) for the validated article and, when embeddings are " +
    "enabled, embeds them and verifies every vector (count, dimension, finite values). Nothing becomes searchable until a human publishes.",
  input: runIdInput,
  output: z.object({
    chunk_count: z.number(),
    scopes: z.record(z.string(), z.number()),
    embedded: z.boolean(),
    embedding_model: z.string().nullable(),
    verified: z.literal(true),
    next_stage: z.string(),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx, input) {
    const { run, saved } = await loadRunning(ctx, input.run_id);
    const applied = currentApplied(saved);
    currentPackage(saved, applied);
    const validation = currentValidation(saved, applied);
    if ((validation.output as ValidationReport).passed !== true) {
      throw new ToolError("invalid_state", "Validation has not passed", "Fix the errors from validate_article and validate again");
    }
    const linked = applied.output as Applied;
    const seo = requireStage(saved, "s7_seo", "Save s7_seo first").output as Out<typeof s7SeoSchema>;
    const chunks: IndexOutput["chunks"] = buildChunks({
      title: linked.title, content: linked.markdown, format: "markdown",
      metaTitle: seo.meta_title, metaDescription: seo.meta_description, faq: seo.faq,
    });
    if (!chunks.some((c) => c.scope === "full") || !chunks.some((c) => c.scope === "section")) {
      throw new ToolError("internal", "Indexing produced no sections", "Check the draft has H2 sections");
    }

    let model: string | null = null;
    let dims: number | null = null;
    if (ctx.embeddings) {
      const { vectors, costUsd } = await ctx.embeddings.embed(chunks.map((c) => c.body), "document");
      const ok = vectors.length === chunks.length && vectors.every((v) => v.length === ctx.embeddings!.dims && v.every(Number.isFinite));
      if (!ok) throw new ToolError("internal", "Embedding verification failed", "Retry index_article; if it fails again call report_failure");
      vectors.forEach((v, i) => (chunks[i].embedding = v));
      model = ctx.embeddings.model;
      dims = ctx.embeddings.dims;
      await addEmbeddingCost(ctx, run.id, costUsd);
    }
    const output: IndexOutput = { chunk_count: chunks.length, chunks, embedding_model: model, embedding_dims: dims, verified: true };
    await insertStageOutput(ctx.db, run.id, "s10_index", output, applied.content_hash);
    await touchRun(ctx.db, run.id, "s10_index");
    saved.set("s10_index", { stage: "s10_index", version: 0, output, content_hash: applied.content_hash, created_at: new Date() });

    const scopes: Record<string, number> = {};
    for (const c of chunks) scopes[c.scope] = (scopes[c.scope] ?? 0) + 1;
    return { chunk_count: chunks.length, scopes, embedded: Boolean(model), embedding_model: model, verified: true as const, next_stage: nextStage(saved, run) };
  },
});

export const createDraft = defineTool({
  name: "create_draft",
  title: "Create the article draft for human review",
  description:
    "Final step. Refuses unless: QA (s9_qa) is PASS for the current draft, validate_article passed for the current linked article and " +
    "SEO package, and index_article ran on that exact version. Then creates the article as pending_review with its index entries " +
    "(not searchable), marks the run draft_created and the keyword done. The article is NOT published; a human reviews it.",
  input: runIdInput,
  output: z.object({
    article_id: z.string().uuid(),
    slug: z.string(),
    status: z.literal("pending_review"),
    review_url: z.string(),
    title: z.string(),
    word_count: z.number(),
    links_inserted: z.number(),
    chunks_stored: z.number(),
    validation_warnings: z.array(issue),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async run(ctx, input) {
    const { run, saved } = await loadRunning(ctx, input.run_id);
    if (saved.has("s11_draft")) throw new ToolError("invalid_state", "A draft was already created for this run");
    const draftRecord = requireStage(saved, "s6_draft", "Save the draft first");
    const qa = saved.get("s9_qa");
    if (!qa || qa.content_hash !== draftRecord.content_hash) throw new ToolError("invalid_state", "Editorial QA has not reviewed the current draft", "Run QA (s9_qa) on the latest draft");
    if ((qa.output as Out<typeof s9QaSchema>).verdict !== "PASS") throw new ToolError("invalid_state", "Editorial QA did not pass", "Apply the QA revisions and run QA again");
    const applied = currentApplied(saved);
    const pkgRecord = currentPackage(saved, applied);
    const validation = currentValidation(saved, applied);
    const report = validation.output as ValidationReport;
    if (!report.passed) throw new ToolError("invalid_state", "Validation has not passed", "Fix the errors from validate_article and validate again");
    const index = saved.get("s10_index");
    if (!index || index.content_hash !== applied.content_hash || savedAt(index) < savedAt(validation) || (index.output as IndexOutput).verified !== true) {
      throw new ToolError("invalid_state", "The validated article has not been indexed", "Call index_article");
    }
    if (run.cannibalization?.verdict === "block") throw new ToolError("invalid_state", "Cannibalization check blocked this keyword");

    const linked = applied.output as Applied;
    const pkg = pkgRecord.output as SeoPackage;
    const s1 = saved.get("s1_keyword")!.output as Out<typeof s1KeywordSchema>;
    const s3 = saved.get("s3_brief")!.output as Out<typeof s3BriefSchema>;
    const s4 = saved.get("s4_research")!.output as Out<typeof s4ResearchSchema>;
    const indexOut = index.output as IndexOutput;

    // Re-check at the last moment: another draft for the same keyword may have been created meanwhile.
    const clash = rowsOf<{ slug: string; primary_keyword: string }>(
      await ctx.db.execute(sql`SELECT slug, primary_keyword FROM articles WHERE status IN ('published', 'pending_review') AND primary_keyword IS NOT NULL`),
    ).find((a) => normalizeKeyword(a.primary_keyword) === normalizeKeyword(s1.primary_keyword));
    if (clash) throw new ToolError("conflict", `/blog/${clash.slug} already targets "${s1.primary_keyword}"`, "Call report_failure recommending an update to that article");

    const cited = new Set([...linked.markdown.matchAll(/\[\^(r\d+)\]/g)].map((m) => m[1]));
    const citations = s4.items.filter((i) => cited.has(i.id)).map((i) => ({ id: i.id, title: i.publisher, url: i.source_url, publisher: i.publisher, date: i.published_date ?? undefined }));
    const qaReport = { qa: qa.output, validation: report, seo_warnings: pkg.warnings, run_id: run.id };
    const chunkRows = indexOut.chunks.map((c) => ({
      scope: c.scope,
      section_key: c.section_key,
      heading: c.heading,
      body: c.body,
      content_hash: c.content_hash,
      embedding: c.embedding ? `[${c.embedding.join(",")}]` : null,
      embedding_model: c.embedding ? indexOut.embedding_model : null,
      embedding_dims: c.embedding ? indexOut.embedding_dims : null,
    }));

    // One statement, so the article, its index rows, the run and the keyword change together or not at all.
    let rows;
    try {
      rows = rowsOf<{ article_id: string; chunks: number }>(
        await ctx.db.execute(sql`
          WITH art AS (
            INSERT INTO articles (
              title, slug, summary, content, content_format, content_hash, primary_keyword, secondary_keywords, category, tags, status,
              meta_title, meta_description, og_title, og_description, featured_image_alt, image_prompt, schema_jsonld, faq, citations,
              qa_report, word_count, reading_minutes, author_id, cluster_id, run_id
            )
            SELECT ${linked.title}, ${pkg.slug}, ${pkg.meta_description}, ${linked.markdown}, 'markdown', ${applied.content_hash}, ${s1.primary_keyword},
                   ${JSON.stringify(s1.secondary_keywords)}::jsonb, ${pkg.category}, ${JSON.stringify(pkg.tags)}::jsonb, 'pending_review',
                   ${pkg.meta_title}, ${pkg.meta_description}, ${pkg.og_title}, ${pkg.og_description}, ${pkg.image_alt}, ${pkg.image_prompt},
                   ${JSON.stringify(pkg.schema_jsonld)}::jsonb, ${JSON.stringify(pkg.faq)}::jsonb, ${JSON.stringify(citations)}::jsonb,
                   ${JSON.stringify(qaReport)}::jsonb, ${pkg.metrics.word_count}::int, ${pkg.metrics.reading_minutes}::int,
                   (SELECT id FROM authors WHERE slug = ${s3.eeat.author_slug}),
                   (SELECT cluster_id FROM keyword_queue WHERE id = ${run.keyword_id}::uuid),
                   ${run.id}::uuid
            RETURNING id
          ), ch AS (
            INSERT INTO article_chunks (article_id, scope, section_key, heading, body, content_hash, searchable, embedding, embedding_model, embedding_dims)
            SELECT art.id, c.scope::chunk_scope, c.section_key, c.heading, c.body, c.content_hash, false, c.embedding::vector, c.embedding_model, c.embedding_dims
            FROM art, jsonb_to_recordset(${JSON.stringify(chunkRows)}::jsonb) AS c(
              scope text, section_key text, heading text, body text, content_hash text, embedding text, embedding_model text, embedding_dims int
            )
            RETURNING 1
          ), stage AS (
            INSERT INTO pipeline_stage_outputs (run_id, stage, version, output, content_hash)
            SELECT ${run.id}::uuid, 's11_draft', 1, jsonb_build_object('article_id', art.id, 'slug', ${pkg.slug}::text), ${applied.content_hash} FROM art
          ), runs AS (
            UPDATE pipeline_runs SET status = 'draft_created', article_id = art.id, current_stage = 's11_draft', finished_at = now(), heartbeat_at = now()
            FROM art WHERE pipeline_runs.id = ${run.id}::uuid
          ), kw AS (
            UPDATE keyword_queue SET status = 'done' WHERE id = ${run.keyword_id}::uuid
          )
          SELECT art.id AS article_id, (SELECT count(*)::int FROM ch) AS chunks FROM art
        `),
      );
    } catch (error) {
      if (isUniqueViolation(error)) throw new ToolError("conflict", `The slug "${pkg.slug}" was taken meanwhile`, "Call build_seo_package, validate_article and index_article again");
      throw error;
    }
    const [{ article_id: articleId, chunks }] = rows;
    if (chunks !== indexOut.chunk_count) throw new ToolError("internal", `Stored ${chunks} of ${indexOut.chunk_count} index entries`);

    await audit(ctx.db, { actor: ctx.clientId, actorType: "mcp_client", action: "article.draft_created", entity: "article", entityId: articleId, details: { run_id: run.id, slug: pkg.slug } });
    return {
      article_id: articleId,
      slug: pkg.slug,
      status: "pending_review" as const,
      review_url: `${ctx.siteOrigin}/admin/blog-agent/drafts/${articleId}`,
      title: linked.title,
      word_count: pkg.metrics.word_count,
      links_inserted: linked.applied.length,
      chunks_stored: chunks,
      validation_warnings: report.warnings,
    };
  },
});

