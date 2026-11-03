/**
 * Whether the @vercel/blob SDK can authenticate. Stores connected to a project use OIDC by default: Vercel adds
 * BLOB_STORE_ID and supplies a rotating VERCEL_OIDC_TOKEN at runtime, and no BLOB_READ_WRITE_TOKEN exists. Older
 * stores (or code running outside Vercel) use the static BLOB_READ_WRITE_TOKEN. The SDK picks the right one itself.
 */
export function isBlobStorageConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.BLOB_STORE_ID?.trim() || env.BLOB_READ_WRITE_TOKEN?.trim());
}

export const BLOB_NOT_CONFIGURED =
  "Image storage is not set up: in Vercel open Storage → your Blob store → Connect Project, select this project, then redeploy";
