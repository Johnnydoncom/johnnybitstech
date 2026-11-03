/**
 * Drizzle schema for the blog + blog agent tables.
 * Source of truth for DDL is db/migrations/*.sql; this file mirrors it for typed queries.
 * tests/db/schema.test.ts checks that every table and column here exists after migrating.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  customType,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/** pgvector column without a fixed dimension (dimension is tracked per row). */
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType: () => "vector",
  toDriver: (value) => `[${value.join(",")}]`,
  fromDriver: (value) => JSON.parse(value) as number[],
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const articleStatus = pgEnum("article_status", ["draft", "pending_review", "published", "rejected", "archived"]);
export const contentFormat = pgEnum("content_format", ["html", "markdown"]);
export const chunkScope = pgEnum("chunk_scope", ["full", "intro", "section", "faq", "meta"]);
export const linkTargetType = pgEnum("link_target_type", ["service", "portfolio", "contact", "category", "pillar", "page"]);
export const keywordStatus = pgEnum("keyword_status", ["queued", "claimed", "done", "skipped", "failed"]);
export const runStatus = pgEnum("run_status", ["running", "needs_human", "draft_created", "failed", "abandoned"]);
export const pipelineStage = pgEnum("pipeline_stage", [
  "s1_keyword", "s2_cluster", "s3_brief", "s4_research", "s5_outline", "s6_draft",
  "s7_seo", "s8_links", "s9_qa", "s10_index", "s11_draft",
  // App-produced (0003)
  "s8_applied", "s7_package", "s9_validation",
]);

export type ArticleStatus = (typeof articleStatus.enumValues)[number];
export type ContentFormat = (typeof contentFormat.enumValues)[number];
export type PipelineStage = (typeof pipelineStage.enumValues)[number];

export const authors = pgTable("authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  jobTitle: text("job_title"),
  bio: text("bio"),
  url: text("url"),
  sameAs: jsonb("same_as").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  ...timestamps,
});

export const contentClusters = pgTable("content_clusters", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  pillarKeyword: text("pillar_keyword").notNull(),
  pillarArticleId: uuid("pillar_article_id"),
  parentClusterId: uuid("parent_cluster_id"),
  priority: integer("priority").notNull().default(50),
  notes: text("notes"),
  ...timestamps,
});

export const keywordQueue = pgTable("keyword_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyword: text("keyword").notNull(),
  keywordNormalized: text("keyword_normalized").notNull().unique(),
  priority: integer("priority").notNull().default(50),
  status: keywordStatus("status").notNull().default("queued"),
  clusterId: uuid("cluster_id"),
  source: text("source").$type<"admin" | "agent" | "import">().notNull().default("admin"),
  notes: text("notes"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  claimedByRun: uuid("claimed_by_run"),
  ...timestamps,
});

export const pipelineRuns = pgTable("pipeline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  keywordId: uuid("keyword_id"),
  keyword: text("keyword").notNull(),
  status: runStatus("status").notNull().default("running"),
  currentStage: pipelineStage("current_stage"),
  articleId: uuid("article_id"),
  error: jsonb("error"),
  clientId: text("client_id"),
  embeddingCostUsd: numeric("embedding_cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  cannibalization: jsonb("cannibalization"),
});

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  legacyId: integer("legacy_id").unique(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  content: text("content").notNull().default(""),
  contentFormat: contentFormat("content_format").notNull().default("markdown"),
  contentHash: text("content_hash"),
  primaryKeyword: text("primary_keyword"),
  secondaryKeywords: jsonb("secondary_keywords").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  category: text("category"),
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  status: articleStatus("status").notNull().default("draft"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  featuredImage: text("featured_image"),
  featuredImageAlt: text("featured_image_alt"),
  imagePrompt: text("image_prompt"),
  schemaJsonld: jsonb("schema_jsonld"),
  faq: jsonb("faq").$type<{ question: string; answer: string }[]>(),
  citations: jsonb("citations").$type<{ id: string; title: string; url: string; publisher?: string; date?: string }[]>(),
  qaReport: jsonb("qa_report"),
  wordCount: integer("word_count").notNull().default(0),
  readingMinutes: integer("reading_minutes").notNull().default(1),
  authorId: uuid("author_id"),
  reviewerId: uuid("reviewer_id"),
  clusterId: uuid("cluster_id"),
  runId: uuid("run_id"),
  canonicalOverride: text("canonical_override"),
  rejectionReason: text("rejection_reason"),
  searchTsv: tsvector("search_tsv").generatedAlwaysAs(sql`''::tsvector`),
  ...timestamps,
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const articleChunks = pgTable("article_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id").notNull(),
  scope: chunkScope("scope").notNull(),
  sectionKey: text("section_key").notNull().default(""),
  heading: text("heading"),
  body: text("body").notNull(),
  contentHash: text("content_hash").notNull(),
  searchable: boolean("searchable").notNull().default(false),
  embedding: vector("embedding"),
  embeddingModel: text("embedding_model"),
  embeddingDims: integer("embedding_dims"),
  searchTsv: tsvector("search_tsv").generatedAlwaysAs(sql`''::tsvector`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const linkTargets = pgTable("link_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  type: linkTargetType("type").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  embedding: vector("embedding"),
  embeddingModel: text("embedding_model"),
  embeddingDims: integer("embedding_dims"),
  searchTsv: tsvector("search_tsv").generatedAlwaysAs(sql`''::tsvector`),
  ...timestamps,
});

export const pipelineStageOutputs = pgTable("pipeline_stage_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull(),
  stage: pipelineStage("stage").notNull(),
  version: integer("version").notNull(),
  output: jsonb("output").notNull(),
  contentHash: text("content_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actor: text("actor").notNull(),
  actorType: text("actor_type").$type<"admin" | "mcp_client" | "system">().notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- OAuth / MCP (0002) -----------------------------------------------------

export const oauthClients = pgTable("oauth_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull().unique(),
  kind: text("kind").$type<"cimd" | "dcr">().notNull(),
  clientName: text("client_name").notNull(),
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  metadataFetchedAt: timestamp("metadata_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const oauthAuthRequests = pgTable("oauth_auth_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  scope: text("scope").notNull(),
  state: text("state"),
  resource: text("resource").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  decision: text("decision").$type<"approved" | "denied">(),
  decidedBy: text("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const oauthGrants = pgTable("oauth_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull(),
  adminEmail: text("admin_email").notNull(),
  scope: text("scope").notNull(),
  resource: text("resource").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: text("revoked_reason"),
});

export const oauthCodes = pgTable("oauth_codes", {
  codeHash: text("code_hash").primaryKey(),
  grantId: uuid("grant_id").notNull(),
  clientId: text("client_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const oauthTokens = pgTable("oauth_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  kind: text("kind").$type<"access" | "refresh">().notNull(),
  grantId: uuid("grant_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mcpCallLog = pgTable("mcp_call_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  clientId: text("client_id"),
  grantId: uuid("grant_id"),
  tool: text("tool").notNull(),
  runId: uuid("run_id"),
  ok: boolean("ok").notNull(),
  errorCode: text("error_code"),
  durationMs: integer("duration_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  bucket: text("bucket").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  hits: integer("hits").notNull().default(0),
});

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Author = typeof authors.$inferSelect;
export type LinkTarget = typeof linkTargets.$inferSelect;
