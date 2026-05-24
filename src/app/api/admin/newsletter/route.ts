import { verifySession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const subscribers = await query(
      "SELECT id, email, name, subscribed_at, active FROM newsletter_subscribers ORDER BY subscribed_at DESC"
    );
    return NextResponse.json(subscribers);
  } catch (error) {
    console.error("Newsletter fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await execute("DELETE FROM newsletter_subscribers WHERE id = ?", [id]);
    return NextResponse.json({ message: "Subscriber deleted" });
  } catch (error) {
    console.error("Newsletter delete error:", error);
    return NextResponse.json({ error: "Failed to delete subscriber" }, { status: 500 });
  }
}
