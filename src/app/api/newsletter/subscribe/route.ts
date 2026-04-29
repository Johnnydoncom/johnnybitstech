import { execute, query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Check if already subscribed
    const existing = await query("SELECT id, active FROM newsletter_subscribers WHERE email = ?", [email]);

    if (existing.length > 0) {
      const sub = existing[0] as { id: number; active: number };
      if (sub.active) {
        return NextResponse.json({ message: "Already subscribed" });
      }
      // Re-activate
      await execute("UPDATE newsletter_subscribers SET active = 1, name = ? WHERE id = ?", [name || null, sub.id]);
      return NextResponse.json({ message: "Subscription reactivated" });
    }

    await execute(
      "INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)",
      [email, name || null]
    );

    return NextResponse.json({ message: "Subscribed successfully" }, { status: 201 });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
