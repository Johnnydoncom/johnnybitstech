/**
 * HS256 key for admin session JWTs. Fails closed: with no (or a trivially short) SESSION_SECRET,
 * no session can be created or verified, instead of silently using a guessable fallback.
 * Secrets under 32 characters still work but log a warning; rotate with `openssl rand -base64 32`.
 */
const MIN_SECRET_LENGTH = 16;
const RECOMMENDED_SECRET_LENGTH = 32;

let cached: Uint8Array | null | undefined;

export function getSessionKey(): Uint8Array | null {
  if (cached !== undefined) return cached;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    console.error(`SESSION_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters; admin sessions are disabled.`);
    cached = null;
  } else {
    if (secret.length < RECOMMENDED_SECRET_LENGTH) {
      console.warn(`SESSION_SECRET is shorter than ${RECOMMENDED_SECRET_LENGTH} characters; rotate it with \`openssl rand -base64 32\`.`);
    }
    cached = new TextEncoder().encode(secret);
  }
  return cached;
}
