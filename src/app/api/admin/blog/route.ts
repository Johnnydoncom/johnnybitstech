import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/db/client";
import { articles } from "@/db/schema";
import { articleToLegacyPost, isUniqueViolation, legacyInputToArticle, legacyPostInput } from "@/lib/blog/admin";
import { revalidateBlog } from "@/lib/blog/revalidate";
import { isSameOrigin } from "@/lib/security/same-origin";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await getDb().select().from(articles).orderBy(desc(articles.createdAt));
    // The list view does not need bodies; dropping them keeps the payload small.
    return NextResponse.json(rows.map((a) => ({ ...articleToLegacyPost(a), content: undefined })));
  } catch (error) {
    console.error("Blog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = legacyPostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const now = new Date();
    const [created] = await getDb()
      .insert(articles)
      .values({
        ...legacyInputToArticle(parsed.data),
        status: parsed.data.published ? "published" : "draft",
        publishedAt: parsed.data.published ? now : null,
      })
      .returning({ id: articles.id, slug: articles.slug });

    if (parsed.data.published) revalidateBlog([created.slug]);
    return NextResponse.json({ id: created.id, message: "Post created" }, { status: 201 });
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "A post with this slug already exists" }, { status: 409 });
    }
    console.error("Blog create error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
