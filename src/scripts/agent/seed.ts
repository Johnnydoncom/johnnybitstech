/**
 * Seeds authors + link targets and backfills legacy blog_posts into articles.
 * Safe to re-run. Run after `npm run db:migrate`:  npm run agent:seed
 */
import { config } from "dotenv";
import { getBrandContext } from "../../lib/blog-agent/brand/johnnybits";
import { linkTargetSeeds } from "../../lib/blog-agent/seed/link-targets";
import { backfillLegacyPosts, seedAuthors, seedLinkTargets } from "../../lib/blog-agent/seed/seed";
import { createNeonExecutor } from "../db/neon-executor";

config({ path: ".env.local" });
config();

async function main() {
  const db = createNeonExecutor();
  try {
    const brand = getBrandContext();
    console.log(`Authors upserted: ${await seedAuthors(db, brand.authors)}`);

    const targets = await seedLinkTargets(db, linkTargetSeeds());
    console.log(`Link targets upserted: ${targets.upserted}${targets.deactivated.length ? `; deactivated: ${targets.deactivated.join(", ")}` : ""}`);

    const backfill = await backfillLegacyPosts(db);
    console.log(`Legacy posts found: ${backfill.found}`);
    console.log(`  inserted (${backfill.inserted.length}): ${backfill.inserted.join(", ") || "-"}`);
    console.log(`  already present (${backfill.alreadyPresent.length})`);
    if (backfill.slugConflicts.length) {
      console.warn(`  SLUG CONFLICTS, not copied (${backfill.slugConflicts.length}): ${backfill.slugConflicts.join(", ")}`);
      process.exitCode = 2;
    }
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
