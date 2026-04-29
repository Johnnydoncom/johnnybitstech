import { verifySession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const posts = await query("SELECT * FROM blog_posts WHERE id = ?", [id]);
    if (!posts.length) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(posts[0]);
  } catch (error) {
    console.error("Blog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { title, slug, excerpt, content, tag, published, meta_title, meta_description } = body;

    await execute(
      `UPDATE blog_posts SET title=?, slug=?, excerpt=?, content=?, tag=?, published=?, meta_title=?, meta_description=?, updated_at=NOW()
       WHERE id=?`,
      [title, slug, excerpt || null, content || null, tag || null, published ? 1 : 0, meta_title || null, meta_description || null, id]
    );

    return NextResponse.json({ message: "Post updated" });
  } catch (error) {
    console.error("Blog update error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await execute("DELETE FROM blog_posts WHERE id = ?", [id]);
    return NextResponse.json({ message: "Post deleted" });
  } catch (error) {
    console.error("Blog delete error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
