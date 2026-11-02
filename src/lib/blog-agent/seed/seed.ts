import type { SqlExecutor } from "@/db/executor";
import type { BrandContext } from "../brand/schema";
import { contentHash } from "../hash";
import { contentStats } from "@/lib/blog/text";
import type { LinkTargetSeed } from "./link-targets";

export async function seedAuthors(db: SqlExecutor, authors: BrandContext["authors"]): Promise<number> {
  for (const a of authors) {
    await db.query(
      `INSERT INTO authors (slug, name, job_title, url, same_as)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name, job_title = EXCLUDED.job_title, url = EXCLUDED.url, same_as = EXCLUDED.same_as`,
      [a.slug, a.name, a.jobTitle, a.url, JSON.stringify(a.sameAs)],
    );
  }
  return authors.length;
}

/** Upserts link targets by URL and deactivates seeded URLs that are no longer in the list. */
export async function seedLinkTargets(db: SqlExecutor, targets: LinkTargetSeed[]) {
  for (const t of targets) {
    await db.query(
      `INSERT INTO link_targets (url, title, summary, type, keywords, is_active)
       VALUES ($1, $2, $3, $4::link_target_type, $5::jsonb, true)
       ON CONFLICT (url) DO UPDATE
         SET title = EXCLUDED.title, summary = EXCLUDED.summary, type = EXCLUDED.type,
             keywords = EXCLUDED.keywords, is_active = true`,
      [t.url, t.title, t.summary, t.type, JSON.stringify(t.keywords)],
    );
  }
  const deactivated = await db.query<{ url: string }>(
    `UPDATE link_targets SET is_active = false
     WHERE is_active AND NOT (url = ANY($1::text[]))
     RETURNING url`,
    [targets.map((t) => t.url)],
  );
  return { upserted: targets.length, deactivated: deactivated.map((r) => r.url) };
}

type LegacyPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  tag: string | null;
  published: boolean;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type BackfillReport = {
  found: number;
  inserted: string[];
  alreadyPresent: string[];
  slugConflicts: string[];
};

/**
 * Copies legacy blog_posts into articles (HTML format, same slug, same dates).
 * Idempotent: rows already backfilled (by legacy_id) are left alone, so later edits are never overwritten.
 */
export async function backfillLegacyPosts(db: SqlExecutor): Promise<BackfillReport> {
  const report: BackfillReport = { found: 0, inserted: [], alreadyPresent: [], slugConflicts: [] };
  const [{ exists }] = await db.query<{ exists: boolean }>(`SELECT to_regclass('public.blog_posts') IS NOT NULL AS exists`);
  if (!exists) return report;

  const hasFeaturedImage = (
    await db.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'featured_image'`)
  ).length > 0;

  const posts = await db.query<LegacyPost>(
    `SELECT id, title, slug, excerpt, content, tag, published,
            ${hasFeaturedImage ? "featured_image" : "NULL::text AS featured_image"},
            meta_title, meta_description, created_at, updated_at
     FROM blog_posts ORDER BY id`,
  );
  report.found = posts.length;

  for (const p of posts) {
    const existing = await db.query<{ legacy_id: number | null }>(`SELECT legacy_id FROM articles WHERE legacy_id = $1 OR slug = $2`, [p.id, p.slug]);
    if (existing.some((r) => r.legacy_id === p.id)) {
      report.alreadyPresent.push(p.slug);
      continue;
    }
    if (existing.length > 0) {
      report.slugConflicts.push(p.slug);
      continue;
    }

    const content = p.content ?? "";
    const { wordCount, readingMinutes } = contentStats(content, "html");
    await db.query(
      `INSERT INTO articles (
         legacy_id, title, slug, summary, content, content_format, content_hash, category, tags, status,
         meta_title, meta_description, featured_image, word_count, reading_minutes,
         created_at, updated_at, published_at
       ) VALUES (
         $1, $2, $3, $4, $5, 'html', $6, $7, $8::jsonb, $9::article_status,
         $10, $11, $12, $13, $14, $15, $16, $17
       )`,
      [
        p.id, p.title, p.slug, p.excerpt, content, contentHash(content), p.tag,
        JSON.stringify(p.tag ? [p.tag] : []),
        p.published ? "published" : "draft",
        p.meta_title, p.meta_description, p.featured_image, wordCount, readingMinutes,
        p.created_at, p.updated_at, p.published ? p.created_at : null,
      ],
    );
    report.inserted.push(p.slug);
  }
  return report;
}
