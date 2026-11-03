import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { BLOB_NOT_CONFIGURED, isBlobStorageConfigured } from "@/lib/blob-storage";
import { ImageError, MAX_UPLOAD_BYTES, optimizeImage } from "@/lib/blog-agent/images";
import { isSameOrigin } from "@/lib/security/same-origin";

export const runtime = "nodejs";

/**
 * Featured-image upload for the Blog Posts editor: converts the file to WebP under 400 KB and stores it in
 * Vercel Blob. Returns the public URL; the post itself is saved by the normal create/update request.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await verifySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isBlobStorageConfigured()) return NextResponse.json({ error: BLOB_NOT_CONFIGURED }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `Image is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB` }, { status: 413 });

  let image;
  try {
    image = await optimizeImage(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof ImageError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }

  const rawSlug = String(form?.get("slug") ?? "").trim().toLowerCase();
  const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(rawSlug) && rawSlug.length <= 80 ? rawSlug : "post";
  try {
    const blob = await put(`blog/${slug}.webp`, image.data, { access: "public", contentType: "image/webp", addRandomSuffix: true });
    return NextResponse.json(
      { url: blob.url, bytes: image.bytes, width: image.width, height: image.height, originalBytes: image.originalBytes },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Blog image upload failed", error);
    return NextResponse.json({ error: "Could not store the image; try again" }, { status: 502 });
  }
}
