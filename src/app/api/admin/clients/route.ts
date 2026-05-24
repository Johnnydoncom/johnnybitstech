import { verifySession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const clients = await query("SELECT * FROM clients ORDER BY display_order ASC");
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Clients fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, logo_url, website, display_order } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const result = await execute(
      "INSERT INTO clients (name, logo_url, website, display_order) VALUES (?, ?, ?, ?) RETURNING id",
      [name, logo_url || null, website || null, display_order || 0]
    );

    return NextResponse.json({ id: result.insertId, message: "Client created" }, { status: 201 });
  } catch (error) {
    console.error("Client create error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
