/**
 * 1) Converts every PNG/JPEG in public/assets/blog to an optimised WebP (< 400 KB) beside it.
 * 2) With --update-db: points articles' featured_image and inline <img src> at the .webp files.
 *    Run step 2 only AFTER the .webp files are deployed, or live pages would show broken images.
 * Usage: npm run agent:optimize-images            (files only)
 *        npm run agent:optimize-images -- --update-db
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { optimizeImage } from "../../lib/blog-agent/images";

config({ path: ".env.local" });
config();

const DIR = path.join(process.cwd(), "public", "assets", "blog");

async function convertFiles(): Promise<string[]> {
  const converted: string[] = [];
  for (const file of (await readdir(DIR)).sort()) {
    if (!/\.(png|jpe?g)$/i.test(file)) continue;
    const target = file.replace(/\.(png|jpe?g)$/i, ".webp");
    const out = await optimizeImage(await readFile(path.join(DIR, file)));
    await writeFile(path.join(DIR, target), out.data);
    const before = (await stat(path.join(DIR, file))).size;
    console.log(`${file} ${(before / 1024).toFixed(0)} KB → ${target} ${(out.bytes / 1024).toFixed(0)} KB (${out.width}×${out.height}, q${out.quality})`);
    converted.push(file);
  }
  return converted;
}

async function updateDatabase(files: string[]) {
  const { neon } = await import("@neondatabase/serverless");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  // Swapping an image file is not a content change, so updated_at (sitemap lastmod, dateModified) is preserved:
  // the touch trigger is disabled for these updates only, inside one transaction.
  const updates = files.flatMap((file) => {
    const from = `/assets/blog/${file}`;
    const to = from.replace(/\.(png|jpe?g)$/i, ".webp");
    return [
      sql.query("UPDATE articles SET featured_image = $2 WHERE featured_image = $1 RETURNING id", [from, to]),
      sql.query("UPDATE articles SET content = replace(content, $1, $2) WHERE strpos(content, $1) > 0 RETURNING id", [`src="${from}"`, `src="${to}"`]),
    ];
  });
  const results = await sql.transaction([
    sql.query("ALTER TABLE articles DISABLE TRIGGER articles_touch"),
    ...updates,
    sql.query("ALTER TABLE articles ENABLE TRIGGER articles_touch"),
  ]);
  const counts = results.slice(1, -1).map((r) => (r as unknown[]).length);
  const featured = counts.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
  const inline = counts.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
  console.log(`Updated featured images: ${featured}, articles with inline images: ${inline}`);
  console.log("The blog revalidates within an hour; redeploy or save any post in the admin to refresh immediately.");
}

async function main() {
  const files = await convertFiles();
  if (process.argv.includes("--update-db")) await updateDatabase(files);
  else console.log("\nFiles written. Deploy them, then run: npm run agent:optimize-images -- --update-db");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
