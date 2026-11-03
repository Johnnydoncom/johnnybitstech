"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import { revokeGrant } from "@/lib/oauth/flow";

export async function revokeConnection(formData: FormData) {
  const session = await requireAdmin();
  const grantId = String(formData.get("grant_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(grantId)) return;
  const db = getDb();
  await revokeGrant(db, grantId, "revoked_by_admin");
  await audit(db, { actor: session.email, actorType: "admin", action: "connector.revoke", entity: "oauth_grant", entityId: grantId });
  revalidatePath("/admin/blog-agent/connections");
}
