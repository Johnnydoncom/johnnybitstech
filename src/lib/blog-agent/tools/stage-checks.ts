import { sql } from "drizzle-orm";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { getBrandContext } from "../brand/johnnybits";
import type { PipelineStage } from "@/db/schema";
import type { AgentStage } from "../schemas/stages";
import type { StageRecord } from "./run-store";
import type { s2ClusterSchema, s3BriefSchema, s4ResearchSchema, s6DraftSchema, s8LinksSchema } from "../schemas/stages";
import type { z } from "zod";

export type CheckIssue = { path: string; message: string };
export type CheckResult = { errors: CheckIssue[]; warnings: CheckIssue[] };

type MdNode = { type: string; depth?: number; identifier?: string; url?: string; value?: string; children?: MdNode[] };

export function parseMarkdown(markdown: string): MdNode {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdNode;
}

function walk(node: MdNode, visit: (n: MdNode) => void) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function textOf(node: MdNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

/** Site paths the agent may link to: published articles and active link targets. */
export async function existingSitePaths(db: Db, urls: readonly string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const rows = rowsOf<{ url: string }>(
    await db.execute(sql`
      SELECT '/blog/' || slug AS url FROM articles WHERE status = 'published' AND '/blog/' || slug IN ${[...urls]}
      UNION
      SELECT url FROM link_targets WHERE is_active AND url IN ${[...urls]}
    `),
  );
  return new Set(rows.map((r) => r.url));
}

async function checkSitePaths(db: Db, entries: { path: string; url: string }[], errors: CheckIssue[]) {
  const existing = await existingSitePaths(db, entries.map((e) => e.url));
  for (const e of entries) {
    if (!existing.has(e.url)) {
      errors.push({ path: e.path, message: `${e.url} is not a published page. Use only URLs returned by search_site_content or get_brand_context.` });
    }
  }
}

/** Database- and cross-stage checks run after the stage's zod schema passes. */
export async function checkStage(db: Db, stage: AgentStage, output: unknown, saved: ReadonlyMap<PipelineStage, StageRecord>): Promise<CheckResult> {
  const errors: CheckIssue[] = [];
  const warnings: CheckIssue[] = [];

  switch (stage) {
    case "s2_cluster": {
      const o = output as z.output<typeof s2ClusterSchema>;
      await checkSitePaths(db, o.related_existing.map((r, i) => ({ path: `related_existing.${i}.url`, url: r.url })), errors);
      break;
    }

    case "s3_brief": {
      const o = output as z.output<typeof s3BriefSchema>;
      await checkSitePaths(db, o.internal_link_targets.map((t, i) => ({ path: `internal_link_targets.${i}.url`, url: t.url })), errors);
      const brand = getBrandContext();
      if (o.cta.url.startsWith("/")) await checkSitePaths(db, [{ path: "cta.url", url: o.cta.url }], errors);
      else if (!brand.ctas.some((c) => c.url === o.cta.url)) errors.push({ path: "cta.url", message: "External CTA URLs must be one of the CTAs in get_brand_context" });
      const [author] = rowsOf(await db.execute(sql`SELECT 1 FROM authors WHERE slug = ${o.eeat.author_slug}`));
      if (!author) errors.push({ path: "eeat.author_slug", message: `Unknown author "${o.eeat.author_slug}". Use an author slug from get_brand_context.` });
      break;
    }

    case "s5_outline": {
      const o = output as { markdown: string };
      const headings: { depth: number; text: string }[] = [];
      walk(parseMarkdown(o.markdown), (n) => n.type === "heading" && headings.push({ depth: n.depth ?? 0, text: textOf(n).trim() }));
      if (headings.some((h) => h.depth === 1)) errors.push({ path: "markdown", message: "No H1 in the outline; the title is separate" });
      if (headings.filter((h) => h.depth === 2).length < 3) errors.push({ path: "markdown", message: "The outline needs at least three H2 sections" });
      const seen = new Set<string>();
      for (const h of headings) {
        const key = h.text.toLowerCase();
        if (seen.has(key)) errors.push({ path: "markdown", message: `Duplicate heading "${h.text}"` });
        seen.add(key);
      }
      if (!headings.some((h) => h.depth === 2 && /faq|frequently asked/i.test(h.text))) {
        errors.push({ path: "markdown", message: "Add an H2 FAQ section (e.g. \"Frequently asked questions\")" });
      }
      break;
    }

    case "s6_draft": {
      const o = output as z.output<typeof s6DraftSchema>;
      const research = saved.get("s4_research")?.output as z.output<typeof s4ResearchSchema> | undefined;
      const sources = new Map((research?.items ?? []).map((i) => [i.id, i.source_url]));
      const tree = parseMarkdown(o.markdown);
      const refs = new Set<string>();
      const defs = new Map<string, MdNode>();
      let h1 = false;
      let table = false;
      walk(tree, (n) => {
        if (n.type === "heading" && n.depth === 1) h1 = true;
        if (n.type === "table") table = true;
        if (n.type === "footnoteReference" && n.identifier) refs.add(n.identifier);
        if (n.type === "footnoteDefinition" && n.identifier) defs.set(n.identifier, n);
        // A [^id] with no definition is not parsed as a footnote: it would render as literal text.
        if (n.type === "text" && n.value) {
          for (const m of n.value.matchAll(/\[\^([^\]\s]+)\]/g)) {
            errors.push({
              path: "markdown",
              message: sources.has(m[1])
                ? `Citation [^${m[1]}] has no footnote definition ([^${m[1]}]: …)`
                : `Citation [^${m[1]}] does not match any saved research item id`,
            });
          }
        }
      });
      if (h1) errors.push({ path: "markdown", message: "Remove the H1: the title is rendered separately" });
      for (const id of refs) {
        if (!sources.has(id)) errors.push({ path: "markdown", message: `Citation [^${id}] does not match any saved research item id` });
        else if (!defs.has(id)) errors.push({ path: "markdown", message: `Citation [^${id}] has no footnote definition ([^${id}]: …)` });
      }
      for (const [id, def] of defs) {
        if (!refs.has(id)) warnings.push({ path: "markdown", message: `Footnote [^${id}] is defined but never cited` });
        const urls: string[] = [];
        walk(def, (n) => n.type === "link" && n.url && urls.push(n.url));
        const expected = sources.get(id);
        if (expected && !urls.includes(expected) && !textOf(def).includes(expected)) {
          errors.push({ path: "markdown", message: `Footnote [^${id}] must link to its research source ${expected}` });
        }
      }
      if (!table) warnings.push({ path: "markdown", message: "No table found; the brief requires at least one" });
      const missing = (o.markdown.match(/\[\[NEEDS_SOURCE\]\]/g) ?? []).length;
      if (missing) warnings.push({ path: "markdown", message: `${missing} [[NEEDS_SOURCE]] marker(s) remain; QA will fail until they are resolved` });
      break;
    }

    case "s8_links": {
      const o = output as z.output<typeof s8LinksSchema>;
      await checkSitePaths(db, o.links.map((l, i) => ({ path: `links.${i}.url`, url: l.url })), errors);
      const draft = (saved.get("s6_draft")?.output as { markdown?: string } | undefined)?.markdown ?? "";
      const anchors = new Set<string>();
      o.links.forEach((l, i) => {
        if (!draft.includes(l.sentence)) errors.push({ path: `links.${i}.sentence`, message: "Sentence is not copied verbatim from the latest draft" });
        if (!l.sentence.includes(l.anchor_text)) errors.push({ path: `links.${i}.anchor_text`, message: "Anchor text must appear verbatim in the sentence" });
        if (/^(click here|here|read more|this|link)$/i.test(l.anchor_text.trim())) errors.push({ path: `links.${i}.anchor_text`, message: "Use descriptive anchor text" });
        const key = l.anchor_text.toLowerCase();
        if (anchors.has(key)) errors.push({ path: `links.${i}.anchor_text`, message: "Do not repeat the same anchor text" });
        anchors.add(key);
      });
      break;
    }

    default:
      break;
  }
  return { errors, warnings };
}
