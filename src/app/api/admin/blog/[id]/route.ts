import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/db/client";
import { articles } from "@/db/schema";
import {
  articleIdParam,
  articleToLegacyPost,
  isUniqueViolation,
  legacyInputToArticle,
  legacyPostInput,
} from "@/lib/blog/admin";
import { revalidateBlog } from "@/lib/blog/revalidate";
import { AdminError, deleteArticle } from "@/lib/blog-agent/admin/drafts";
import { isSameOrigin } from "@/lib/security/same-origin";

type Params = { params: Promise<{ id: string }> };

/** The legacy Quill editor only handles HTML articles in draft/published state; agent drafts are managed in /admin/blog-agent. */
const EDITABLE_STATUSES = new Set(["draft", "published"]);

async function loadArticle(rawId: string) {
  const id = articleIdParam.safeParse(rawId);
  if (!id.success) return null;
  const [row] = await getDb().select().from(articles).where(eq(articles.id, id.data)).limit(1);
  return row ?? null;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const article = await loadArticle((await params).id);
    if (!article) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(articleToLegacyPost(article));
  } catch (error) {
    console.error("Blog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = legacyPostInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const existing = await loadArticle((await params).id);
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (existing.contentFormat !== "html" || !EDITABLE_STATUSES.has(existing.status)) {
      return NextResponse.json(
        { error: "This article is managed by the Blog Agent. Edit it in Admin → Blog Agent." },
        { status: 409 },
      );
    }

    const publish = parsed.data.published;
    await getDb()
      .update(articles)
      .set({
        ...legacyInputToArticle(parsed.data),
        status: publish ? "published" : "draft",
        publishedAt: publish ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      })
      .where(eq(articles.id, existing.id));

    if (publish || existing.status === "published") revalidateBlog([existing.slug, parsed.data.slug]);
    return NextResponse.json({ message: "Post updated" });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "A post with this slug already exists" }, { status: 409 });
    }
    console.error("Blog update error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const existing = await loadArticle((await params).id);
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // Agent (Markdown) articles: same delete as the Blog Agent review page, including their Blob images.
    if (existing.contentFormat === "markdown") {
      const { slug, wasPublished, blobUrls } = await deleteArticle(getDb(), existing.id);
      if (blobUrls.length) await del(blobUrls).catch((error) => console.error("Blob clean-up failed", error));
      if (wasPublished) revalidateBlog([slug]);
      return NextResponse.json({ message: "Post deleted" });
    }
    if (!EDITABLE_STATUSES.has(existing.status)) {
      return NextResponse.json({ error: "This post cannot be deleted in its current state" }, { status: 409 });
    }

    await getDb().delete(articles).where(eq(articles.id, existing.id));
    if (existing.featuredImage && /\.public\.blob\.vercel-storage\.com\//.test(existing.featuredImage)) {
      await del(existing.featuredImage).catch((error) => console.error("Blob clean-up failed", error));
    }
    if (existing.status === "published") revalidateBlog([existing.slug]);
    return NextResponse.json({ message: "Post deleted" });
  } catch (error) {
    if (error instanceof AdminError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Blog delete error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
