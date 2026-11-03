import "server-only";
import { revalidatePath } from "next/cache";
import { BLOG_PATH, postPath } from "./seo";

/**
 * Refreshes every page that shows blog content after a write.
 * Call from Server Actions / Route Handlers after the DB write has committed.
 */
export function revalidateBlog(slugs: readonly (string | null | undefined)[] = []) {
  revalidatePath(BLOG_PATH);
  for (const slug of new Set(slugs.filter((s): s is string => Boolean(s)))) {
    revalidatePath(postPath(slug));
  }
  revalidatePath("/sitemap.xml");
}
