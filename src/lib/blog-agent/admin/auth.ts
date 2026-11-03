import "server-only";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { query } from "@/lib/db";

/** Session + admin role check for every Blog Agent admin action and page. */
export async function requireAdmin(): Promise<{ email: string }> {
  const session = await verifySession();
  if (!session) redirect("/admin/login");
  const [user] = await query<{ role: string }>("SELECT role FROM admin_users WHERE email = ? LIMIT 1", [session.email]);
  if (user?.role !== "admin") redirect("/admin?error=forbidden");
  return { email: session.email };
}
