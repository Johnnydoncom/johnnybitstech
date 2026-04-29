"use server";

import { createSession, verifyCredentials } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const valid = await verifyCredentials(email, password);

  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await createSession(email);
  redirect("/admin");
}
