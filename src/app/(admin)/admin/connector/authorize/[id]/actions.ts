"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { audit } from "@/lib/audit";
import { verifySession } from "@/lib/auth";
import { getOAuthConfig } from "@/lib/oauth/config";
import { OAuthError } from "@/lib/oauth/errors";
import { decideAuthorization } from "@/lib/oauth/flow";

/** Server Action (Next.js checks Origin against Host, so this is CSRF-protected). */
export async function decideConsent(formData: FormData) {
  const session = await verifySession();
  if (!session) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const approve = formData.get("decision") === "approve";
  const db = getDb();
  let redirectTo: string;
  try {
    const result = await decideAuthorization(db, getOAuthConfig(), id, session.email, approve);
    redirectTo = result.redirectTo;
    await audit(db, {
      actor: session.email,
      actorType: "admin",
      action: approve ? "connector.approve" : "connector.deny",
      entity: "oauth_auth_request",
      entityId: id,
      details: { grantId: result.grantId },
      ip: (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
  } catch (error) {
    if (error instanceof OAuthError) redirect(`/admin/connector/authorize/${encodeURIComponent(id)}?error=expired`);
    throw error;
  }
  redirect(redirectTo);
}
