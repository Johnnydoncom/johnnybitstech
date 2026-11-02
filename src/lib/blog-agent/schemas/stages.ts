import { z } from "zod";
import type { PipelineStage } from "@/db/schema";

/**
 * Output contracts for the stages Claude runs in Cowork (s1–s9).
 * s10 (indexing) and s11 (draft) are produced by the app itself.
 * Cross-checks that need the database (URLs exist, citations map to research) live in tools/stage-checks.ts.
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const sitePath = z.string().regex(/^\/[a-z0-9/-]*$/, "Use a site path returned by the connector, e.g. /contact-us");
const isoDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "Use YYYY, YYYY-MM or YYYY-MM-DD");

export const s1KeywordSchema = z.object({
  primary_keyword: text(120),
  search_intent: z.enum(["informational", "commercial", "transactional", "navigational"]),
  audience: text(300),
  locale: z.object({
    country: z.string().length(2).default("NG"),
    is_local_intent: z.boolean(),
    cities: z.array(text(60)).max(10).default([]),
  }),
  secondary_keywords: z.array(text(120)).max(15),
  questions: z.array(text(200)).max(12).describe("Questions searchers ask (People Also Ask style)"),
  serp_features: z.array(text(60)).max(10).default([]),
  content_type: z.enum(["guide", "how_to", "comparison", "listicle", "cost_breakdown", "explainer", "checklist"]),
  target_word_count: z.number().int().min(800).max(4000),
  notes: z.string().max(2000).optional(),
});

export const s2ClusterSchema = z.object({
  role: z.enum(["pillar", "supporting"]),
  cluster_name: text(120),
  pillar_keyword: text(120),
  related_existing: z
    .array(z.object({ url: sitePath, relation: z.enum(["parent", "sibling", "child"]), reason: text(300) }))
    .max(10)
    .default([]),
});

export const s3BriefSchema = z.object({
  working_title: text(120),
  angle: text(600),
  reader_outcome: text(400),
  h2_plan: z.array(text(120)).min(4).max(12),
  must_cover: z.array(text(300)).min(3).max(20),
  eeat: z.object({
    author_slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    experience_angles: z.array(text(400)).max(6).describe("Only from get_brand_context (services, portfolio). Never invented."),
  }),
  internal_link_targets: z.array(z.object({ url: sitePath, reason: text(300) })).max(10),
  cta: z.object({ label: text(120), url: z.union([sitePath, z.string().url()]) }),
  word_count_target: z.number().int().min(800).max(4000),
  avoid: z.array(text(300)).max(15).default([]),
});

export const researchItemSchema = z
  .object({
    id: z.string().regex(/^r\d{1,3}$/, "Research ids are r1, r2, …"),
    claim: text(600),
    type: z.enum(["fact", "statistic", "opinion"]),
    source_url: z.string().url().refine((u) => u.startsWith("https://"), "Sources must be https URLs"),
    publisher: text(200),
    published_date: isoDate.nullable(),
    accessed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    confidence: z.enum(["high", "medium", "low"]),
    quote: z.string().max(300).optional().describe("Short supporting excerpt, 25 words or fewer"),
    nigeria_specific: z.boolean(),
  })
  .refine((r) => r.type !== "statistic" || r.published_date !== null, {
    message: "Statistics need a published_date",
    path: ["published_date"],
  })
  .refine((r) => !r.quote || r.quote.split(/\s+/).length <= 25, { message: "Quotes must be 25 words or fewer", path: ["quote"] });

export const s4ResearchSchema = z
  .object({ items: z.array(researchItemSchema).min(3).max(60) })
  .refine((r) => new Set(r.items.map((i) => i.id)).size === r.items.length, { message: "Research ids must be unique", path: ["items"] });

export const s5OutlineSchema = z.object({
  markdown: z.string().min(200).max(20_000),
  table_plan: text(500).describe("What the comparison/summary table will show and where it goes"),
  cta_placement: text(300),
});

export const s6DraftSchema = z.object({
  title: text(120),
  markdown: z.string().min(2_000).max(60_000).describe("Body only: no H1. Citations as [^rN] footnotes matching research ids."),
});

export const s7SeoSchema = z.object({
  meta_title: z.string().trim().min(20).max(60),
  meta_description: z.string().trim().min(120).max(160),
  og_title: z.string().trim().max(90).optional(),
  og_description: z.string().trim().max(200).optional(),
  slug_suggestion: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  category: text(40),
  tags: z.array(text(40)).min(1).max(8),
  image_prompt: text(1000),
  image_alt: z.string().trim().min(10).max(125),
  faq: z.array(z.object({ question: text(200), answer: text(1000) })).min(2).max(8),
});

export const s8LinksSchema = z.object({
  links: z
    .array(
      z.object({
        url: sitePath,
        anchor_text: z.string().trim().min(2).max(80),
        sentence: z.string().trim().min(10).max(600).describe("Copied verbatim from the draft"),
        reason: text(300),
      }),
    )
    .max(12),
});

export const s9QaSchema = z
  .object({
    verdict: z.enum(["PASS", "FAIL"]),
    summary: text(1500),
    issues: z
      .array(
        z.object({
          severity: z.enum(["blocker", "major", "minor"]),
          location: text(200),
          problem: text(600),
          exact_revision: text(2000),
        }),
      )
      .max(40),
  })
  .refine((q) => q.verdict === "FAIL" || q.issues.every((i) => i.severity === "minor"), {
    message: "A PASS cannot contain blocker or major issues",
    path: ["verdict"],
  })
  .refine((q) => q.verdict === "PASS" || q.issues.some((i) => i.severity !== "minor"), {
    message: "A FAIL must list at least one blocker or major issue with an exact revision",
    path: ["issues"],
  });

export const AGENT_STAGES = [
  "s1_keyword", "s2_cluster", "s3_brief", "s4_research", "s5_outline", "s6_draft", "s7_seo", "s8_links", "s9_qa",
] as const satisfies readonly PipelineStage[];
export type AgentStage = (typeof AGENT_STAGES)[number];

export const stageSchemas = {
  s1_keyword: s1KeywordSchema,
  s2_cluster: s2ClusterSchema,
  s3_brief: s3BriefSchema,
  s4_research: s4ResearchSchema,
  s5_outline: s5OutlineSchema,
  s6_draft: s6DraftSchema,
  s7_seo: s7SeoSchema,
  s8_links: s8LinksSchema,
  s9_qa: s9QaSchema,
} as const satisfies Record<AgentStage, z.ZodType>;

/** Stages that must already be saved before a stage can be saved (s2 is optional). */
export const STAGE_PREREQUISITES: Record<AgentStage, AgentStage[]> = {
  s1_keyword: [],
  s2_cluster: ["s1_keyword"],
  s3_brief: ["s1_keyword"],
  s4_research: ["s3_brief"],
  s5_outline: ["s4_research"],
  s6_draft: ["s5_outline"],
  s7_seo: ["s6_draft"],
  s8_links: ["s6_draft"],
  s9_qa: ["s6_draft", "s7_seo", "s8_links"],
};

/** The order Claude is expected to follow; used to report the next step. */
export const STAGE_FLOW: AgentStage[] = ["s1_keyword", "s3_brief", "s4_research", "s5_outline", "s6_draft", "s8_links", "s7_seo", "s9_qa"];
