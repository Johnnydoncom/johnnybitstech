import sharp from "sharp";

/** Every blog image is stored as WebP under this size. */
export const MAX_IMAGE_BYTES = 400 * 1024;
/** Largest accepted original (Vercel caps request bodies at 4.5 MB). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif", "tiff", "heif"]);
/** Decompression-bomb guard: refuse images with more pixels than this (e.g. 8000 × 6000). */
export const MAX_INPUT_PIXELS = 48_000_000;
/** Tried in order until the file fits: (max edge in px, WebP quality). */
const LADDER: [number, number][] = [
  [1600, 82], [1600, 75], [1600, 68], [1400, 68], [1200, 65], [1200, 58], [1000, 55], [900, 50], [800, 45],
];

export class ImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageError";
  }
}

export type OptimizedImage = { data: Buffer; bytes: number; width: number; height: number; quality: number; originalBytes: number };

/**
 * Converts any common image to WebP under MAX_IMAGE_BYTES: auto-rotates from EXIF, strips metadata, resizes
 * down (never up) and lowers quality step by step until it fits. Throws ImageError for non-images or if it can't fit.
 */
export async function optimizeImage(input: Buffer | Uint8Array): Promise<OptimizedImage> {
  const original = Buffer.from(input);
  if (original.length > MAX_UPLOAD_BYTES) throw new ImageError(`Image is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  let meta: sharp.Metadata;
  try {
    // Header-only read (no pixel decode), so it is safe before the dimension check below.
    meta = await sharp(original, { failOn: "error", limitInputPixels: false }).metadata();
  } catch {
    throw new ImageError("That file is not a readable image");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) throw new ImageError(`Unsupported image format: ${meta.format ?? "unknown"}`);
  if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_INPUT_PIXELS) throw new ImageError("Image dimensions are too large; use at most 8000 × 6000 px");
  if ((meta.width ?? 0) < 600 || (meta.height ?? 0) < 315) throw new ImageError("Image is too small; use at least 600 × 315 px (1200 × 630 is ideal)");

  for (const [edge, quality] of LADDER) {
    const { data, info } = await sharp(original, { failOn: "error", animated: false, limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    if (data.length <= MAX_IMAGE_BYTES) {
      return { data, bytes: data.length, width: info.width, height: info.height, quality, originalBytes: original.length };
    }
  }
  throw new ImageError("Could not compress this image under 400 KB; try a simpler image");
}
