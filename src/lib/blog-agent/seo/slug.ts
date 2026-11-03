import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";

export const MAX_SLUG_LENGTH = 80;

/** Lower-case ASCII slug: "Website Cost in Nigeria (2026)!" → "website-cost-in-nigeria-2026". */
export function slugify(input: string, maxLength = MAX_SLUG_LENGTH): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  return cut.includes("-") ? cut.slice(0, cut.lastIndexOf("-")) : cut;
}

/**
 * First free slug among every article (any status): base, base-2, base-3, …
 * `ownArticleId` lets an article keep its own slug when rebuilt.
 */
export async function uniqueSlug(db: Db, base: string, ownArticleId: string | null = null): Promise<string> {
  const root = slugify(base, MAX_SLUG_LENGTH - 4) || "article";
  const taken = new Set(
    rowsOf<{ slug: string }>(
      await db.execute(sql`
        SELECT slug FROM articles
        WHERE (slug = ${root} OR slug LIKE ${`${root}-%`}) AND (${ownArticleId}::uuid IS NULL OR id <> ${ownArticleId}::uuid)
      `),
    ).map((r) => r.slug),
  );
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
}
