import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSessionKey } from "@/lib/session-key";

export type SessionPayload = {
  email: string;
  expiresAt: Date;
};

export async function encrypt(payload: SessionPayload) {
  const encodedKey = getSessionKey();
  if (!encodedKey) throw new Error("SESSION_SECRET is not configured");
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  const encodedKey = getSessionKey();
  if (!encodedKey || !session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(email: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ email, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function verifySession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  const session = await decrypt(cookie);

  if (!session) return null;

  // Check if expired
  if (new Date(session.expiresAt) < new Date()) return null;

  return session;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function verifyCredentials(email: string, password: string) {
  try {
    const users = await query<{ password_hash: string }>(
      "SELECT password_hash FROM admin_users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!users || users.length === 0) {
      return false;
    }

    return bcrypt.compare(password, users[0].password_hash);
  } catch (error) {
    console.error("Auth DB Error:", error);
    return false;
  }
}

