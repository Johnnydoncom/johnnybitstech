"use server";

import { createSession, verifyCredentials } from "@/lib/auth";
import { redirect } from "next/navigation";
import { safeAdminNext } from "@/lib/safe-next";
import { getSessionKey } from "@/lib/session-key";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  // Fail closed but explain why, instead of crashing after the password check.
  if (!getSessionKey()) {
    return { error: "Admin login is not configured on this server: set SESSION_SECRET (32+ random characters) and redeploy." };
  }

  const valid = await verifyCredentials(email, password);

  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await createSession(email);
  redirect(safeAdminNext(formData.get("next")));
}
