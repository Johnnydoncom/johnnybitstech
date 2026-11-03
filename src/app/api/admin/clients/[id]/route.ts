import { verifySession } from "@/lib/auth";
import { execute } from "@/lib/db";
import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security/same-origin";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, logo_url, website, display_order, active } = body;

    await execute(
      "UPDATE clients SET name=?, logo_url=?, website=?, display_order=?, active=? WHERE id=?",
      [name, logo_url || null, website || null, display_order || 0, active !== undefined ? (active ? 1 : 0) : 1, id]
    );

    return NextResponse.json({ message: "Client updated" });
  } catch (error) {
    console.error("Client update error:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await execute("DELETE FROM clients WHERE id = ?", [id]);
    return NextResponse.json({ message: "Client deleted" });
  } catch (error) {
    console.error("Client delete error:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
