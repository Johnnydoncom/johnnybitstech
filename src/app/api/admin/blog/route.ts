import { verifySession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const posts = await query(
      "SELECT id, title, slug, excerpt, tag, published, created_at, updated_at FROM blog_posts ORDER BY created_at DESC"
    );
    return NextResponse.json(posts);
  } catch (error) {
    console.error("Blog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, slug, excerpt, content, tag, published, meta_title, meta_description } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
    }

    const result = await execute(
      `INSERT INTO blog_posts (title, slug, excerpt, content, tag, published, meta_title, meta_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, excerpt || null, content || null, tag || null, published ? 1 : 0, meta_title || null, meta_description || null]
    );

    return NextResponse.json({ id: result.insertId, message: "Post created" }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "A post with this slug already exists" }, { status: 409 });
    }
    console.error("Blog create error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
