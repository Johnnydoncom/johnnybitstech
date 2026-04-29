import { verifySession, verifyCredentials, createSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { execute } from "@/lib/db";
export async function PUT(request: Request) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { currentPassword, newPassword, newEmail } = await request.json();

    if (!currentPassword || !newPassword || !newEmail) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Verify current password
    const valid = await verifyCredentials(session.email, currentPassword);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    // Generate new hash
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update database
    await execute(
      "UPDATE admin_users SET email = ?, password_hash = ? WHERE email = ?",
      [newEmail, newHash, session.email]
    );

    // If email changed, we need to update the session
    if (newEmail !== session.email) {
      await createSession(newEmail);
    }

    return NextResponse.json({
      message: "Credentials updated successfully.",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
