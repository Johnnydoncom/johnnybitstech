"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import {
  AdminError, deleteRejected, editInternalLink, getArticle, publishArticle, rejectArticle, restoreToReview, setFeaturedImage, setFeaturedImageAlt, setImagePrompt, unpublishArticle, updateDraft,
} from "@/lib/blog-agent/admin/drafts";
import { addKeywords, deleteKeyword, requeueKeyword, setPriority, skipKeyword } from "@/lib/blog-agent/admin/queue";
import { abandonRun, resumeRun } from "@/lib/blog-agent/admin/runs";
import { getEmbeddingsProvider } from "@/lib/blog-agent/embeddings";
import { parseAgentEnv } from "@/lib/blog-agent/env";
import { cropToFeatured, generateFeaturedImage, imageGenConfig } from "@/lib/blog-agent/image-gen";
import { altFromStockPhoto, downloadStockPhoto, PROVIDER_INFO, stockPhotoConfig } from "@/lib/blog-agent/stock-photos";
import { ImageError, optimizeImage, type OptimizedImage } from "@/lib/blog-agent/images";
import { BLOB_NOT_CONFIGURED, isBlobStorageConfigured } from "@/lib/blob-storage";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateBlog } from "@/lib/blog/revalidate";

const BASE = "/admin/blog-agent";
const field = (fd: FormData, name: string) => String(fd.get(name) ?? "");
const id = (fd: FormData, name = "id") => {
  const v = field(fd, name);
  if (!/^[0-9a-f-]{36}$/i.test(v)) throw new AdminError("Invalid id");
  return v;
};

function withMessage(path: string, kind: "ok" | "error", message: string) {
  const url = new URL(path, "https://admin.local");
  url.searchParams.set(kind, message.slice(0, 1500));
  return `${url.pathname}${url.search}`;
}

/** Runs an admin mutation: expected errors become a message on the page; anything else is a real error. */
async function attempt(back: string, action: string, fn: (admin: { email: string }) => Promise<string>) {
  const admin = await requireAdmin();
  let target: string;
  try {
    target = withMessage(back, "ok", await fn(admin));
  } catch (error) {
    if (error instanceof AdminError) {
      target = withMessage(back, "error", error.issues.length ? `${error.message}: ${error.issues.map((i) => i.message).join(" · ")}` : error.message);
    } else if (error instanceof ImageError) {
      target = withMessage(back, "error", error.message);
    } else {
      console.error(`admin action ${action} failed`, error);
      target = withMessage(back, "error", "Something went wrong; nothing was changed. Check the server logs.");
    }
  }
  revalidatePath(BASE, "layout");
  redirect(target);
}

async function log(admin: { email: string }, action: string, entity: string, entityId: string | null, details?: unknown) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await audit(getDb(), { actor: admin.email, actorType: "admin", action, entity, entityId, details, ip });
}

// --- Queue -------------------------------------------------------------------

export async function addKeywordsAction(fd: FormData) {
  await attempt(`${BASE}/queue`, "queue.add", async (admin) => {
    const r = await addKeywords(getDb(), field(fd, "keywords"), Number(field(fd, "priority") || 50), field(fd, "notes").trim() || null);
    await log(admin, "queue.add", "keyword_queue", null, r);
    return `Added ${r.added} keyword(s)${r.skipped.length ? `; skipped ${r.skipped.length} already in the queue` : ""}`;
  });
}

export async function setPriorityAction(fd: FormData) {
  await attempt(`${BASE}/queue`, "queue.priority", async (admin) => {
    const k = id(fd);
    await setPriority(getDb(), k, Number(field(fd, "priority")));
    await log(admin, "queue.priority", "keyword_queue", k, { priority: field(fd, "priority") });
    return "Priority updated";
  });
}

export async function skipKeywordAction(fd: FormData) {
  await attempt(`${BASE}/queue`, "queue.skip", async (admin) => {
    const k = id(fd);
    await skipKeyword(getDb(), k);
    await log(admin, "queue.skip", "keyword_queue", k);
    return "Keyword skipped";
  });
}

export async function requeueKeywordAction(fd: FormData) {
  const back = field(fd, "back") === "run" ? `${BASE}/runs/${field(fd, "run_id")}` : `${BASE}/queue`;
  await attempt(back, "queue.requeue", async (admin) => {
    const k = id(fd);
    await requeueKeyword(getDb(), k);
    await log(admin, "queue.requeue", "keyword_queue", k);
    return "Keyword is back in the queue";
  });
}

export async function deleteKeywordAction(fd: FormData) {
  await attempt(`${BASE}/queue`, "queue.delete", async (admin) => {
    const k = id(fd);
    await deleteKeyword(getDb(), k);
    await log(admin, "queue.delete", "keyword_queue", k);
    return "Keyword deleted";
  });
}

// --- Runs --------------------------------------------------------------------

export async function abandonRunAction(fd: FormData) {
  const r = id(fd);
  await attempt(`${BASE}/runs/${r}`, "run.abandon", async (admin) => {
    await abandonRun(getDb(), r, admin.email);
    await log(admin, "run.abandon", "pipeline_run", r);
    return "Run abandoned; re-queue its keyword if you want another attempt";
  });
}

export async function resumeRunAction(fd: FormData) {
  const r = id(fd);
  await attempt(`${BASE}/runs/${r}`, "run.resume", async (admin) => {
    await resumeRun(getDb(), r, admin.email);
    await log(admin, "run.resume", "pipeline_run", r);
    return "Run resumed: the next agent session (scheduled, or Run now) continues from the saved stages";
  });
}

export async function chooseStockPhotoAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.image_stock", async (admin) => {
    const config = stockPhotoConfig();
    if (!config) throw new AdminError("Stock photos are not set up: add PIXABAY_API_KEY (free at pixabay.com/api/docs) or PEXELS_API_KEY, then redeploy");
    requireBlobStorage();
    const article = await getArticle(getDb(), a);
    if (!article) throw new AdminError("Article not found");
    const photoId = Number(field(fd, "photo_id"));
    const { data, photo } = await downloadStockPhoto(photoId, config);
    const image = await optimizeImage(await cropToFeatured(data));
    await storeFeaturedImage(article, image);
    const alt = altFromStockPhoto(photo);
    const library = PROVIDER_INFO[photo.provider].name;
    if (alt.length >= 5) await setFeaturedImageAlt(getDb(), a, alt);
    await log(admin, "article.image_stock", "article", a, {
      source: photo.provider, photo_id: photo.id, photo_url: photo.pageUrl, photographer: photo.photographer, bytes: image.bytes,
    });
    return `Photo by ${photo.photographer} on ${library} saved as WebP (${Math.round(image.bytes / 1024)} KB, ${image.width}×${image.height}).${alt.length >= 5 ? ` Alt text updated from ${library}: check it describes the photo.` : " Check the alt text describes this photo."}`;
  });
}

// --- Drafts ------------------------------------------------------------------

const draftPage = (a: string) => `${BASE}/drafts/${a}`;

export async function saveDraftAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.edit", async (admin) => {
    const provider = getEmbeddingsProvider(parseAgentEnv());
    const result = await updateDraft(getDb(), a, {
      title: field(fd, "title"), slug: field(fd, "slug"), meta_title: field(fd, "meta_title"), meta_description: field(fd, "meta_description"),
      og_title: field(fd, "og_title"), og_description: field(fd, "og_description"), category: field(fd, "category"), tags: field(fd, "tags"),
      featured_image_alt: field(fd, "featured_image_alt"), content: field(fd, "content"),
    }, provider);
    if (result.status === "published") revalidateBlog([result.slug]);
    await log(admin, "article.edit", "article", a);
    return result.status === "published" ? "Saved and updated on the live site" : "Saved";
  });
}

function requireBlobStorage() {
  if (!isBlobStorageConfigured()) throw new AdminError(BLOB_NOT_CONFIGURED);
}

/** Stores an optimised image in Vercel Blob as the article's featured image and removes the one it replaces. */
async function storeFeaturedImage(article: { id: string; slug: string; status: string; featured_image: string | null }, image: OptimizedImage) {
  const blob = await put(`blog/${article.slug}.webp`, image.data, { access: "public", contentType: "image/webp", addRandomSuffix: true });
  await setFeaturedImage(getDb(), article.id, blob.url);
  if (article.featured_image?.includes(".public.blob.vercel-storage.com/")) await del(article.featured_image).catch(() => undefined);
  if (article.status === "published") revalidateBlog([article.slug]);
}

export async function uploadImageAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.image", async (admin) => {
    const file = fd.get("image");
    if (!(file instanceof File) || file.size === 0) throw new AdminError("Choose an image file");
    requireBlobStorage();
    const article = await getArticle(getDb(), a);
    if (!article) throw new AdminError("Article not found");
    const image = await optimizeImage(new Uint8Array(await file.arrayBuffer()));
    await storeFeaturedImage(article, image);
    await log(admin, "article.image", "article", a, { bytes: image.bytes, width: image.width, height: image.height, original: image.originalBytes });
    return `Image saved as WebP: ${(image.bytes / 1024).toFixed(0)} KB (was ${(image.originalBytes / 1024).toFixed(0)} KB), ${image.width}×${image.height}`;
  });
}

export async function generateImageAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.image_generate", async (admin) => {
    const config = imageGenConfig();
    if (!config) throw new AdminError("Image generation is not set up: add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN");
    requireBlobStorage();
    const article = await getArticle(getDb(), a);
    if (!article) throw new AdminError("Article not found");
    const prompt = field(fd, "prompt").trim() || article.image_prompt || "";
    if (prompt !== article.image_prompt) await setImagePrompt(getDb(), a, prompt);
    // Protects the free Cloudflare allowance from repeated clicks (shared across admins, per 24 h window).
    const quota = await rateLimit(getDb(), "image-gen", config.dailyLimit, 86_400);
    if (!quota.allowed) throw new AdminError(`The limit of ${config.dailyLimit} generated images per day is reached; upload an image instead or try again tomorrow`);
    const image = await generateFeaturedImage(prompt, config);
    await storeFeaturedImage(article, image);
    await log(admin, "article.image_generate", "article", a, { model: image.model, bytes: image.bytes, width: image.width, height: image.height });
    return `Image generated and saved as WebP: ${(image.bytes / 1024).toFixed(0)} KB, ${image.width}×${image.height}. Check it suits the article and the alt text still describes it.`;
  });
}

export async function editLinkAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.link", async (admin) => {
    const link = { anchor: field(fd, "anchor"), url: field(fd, "url") };
    const remove = field(fd, "intent") === "remove";
    await editInternalLink(getDb(), a, link, remove ? null : field(fd, "new_url"));
    const article = await getArticle(getDb(), a);
    if (article?.status === "published") revalidateBlog([article.slug]);
    await log(admin, remove ? "article.link_remove" : "article.link_change", "article", a, { ...link, new_url: remove ? null : field(fd, "new_url") });
    return remove ? `Removed the link on “${link.anchor}”` : `“${link.anchor}” now links to ${field(fd, "new_url")}`;
  });
}

export async function publishAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.publish", async (admin) => {
    const { slug } = await publishArticle(getDb(), a, getEmbeddingsProvider(parseAgentEnv()));
    revalidateBlog([slug]);
    await log(admin, "article.publish", "article", a, { slug });
    return `Published at /blog/${slug}`;
  });
}

export async function unpublishAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.unpublish", async (admin) => {
    const { slug, linkedFrom } = await unpublishArticle(getDb(), a);
    revalidateBlog([slug]);
    await log(admin, "article.unpublish", "article", a, { slug, linkedFrom });
    return linkedFrom.length
      ? `Taken offline. ${linkedFrom.length} published article(s) still link to it: ${linkedFrom.map((s) => `/blog/${s}`).join(", ")}`
      : "Taken offline and moved back to review";
  });
}

export async function rejectAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.reject", async (admin) => {
    const requeue = fd.get("requeue") === "on";
    await rejectArticle(getDb(), a, field(fd, "reason"), requeue);
    await log(admin, "article.reject", "article", a, { reason: field(fd, "reason"), requeue });
    return requeue ? "Rejected; the keyword is back in the queue" : "Rejected";
  });
}

export async function restoreAction(fd: FormData) {
  const a = id(fd);
  await attempt(draftPage(a), "article.restore", async (admin) => {
    await restoreToReview(getDb(), a);
    await log(admin, "article.restore", "article", a);
    return "Moved back to review";
  });
}

export async function deleteArticleAction(fd: FormData) {
  const a = id(fd);
  await attempt(`${BASE}/drafts`, "article.delete", async (admin) => {
    const article = await getArticle(getDb(), a);
    const { slug } = await deleteRejected(getDb(), a);
    if (article?.featured_image?.includes(".public.blob.vercel-storage.com/")) await del(article.featured_image).catch(() => undefined);
    await log(admin, "article.delete", "article", a, { slug });
    return `Deleted “${slug}”`;
  });
}
