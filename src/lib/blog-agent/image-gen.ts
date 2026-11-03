import sharp from "sharp";
import { z } from "zod";
import { ImageError, MAX_INPUT_PIXELS, optimizeImage, type OptimizedImage } from "./images";

/**
 * Featured-image generation on Cloudflare Workers AI (FLUX.1 [schnell]). The free allocation (10,000 Neurons a day,
 * about 60 per image) covers far more images than a blog needs. Optional: without credentials the admin offers
 * upload only.
 */
export const IMAGE_GEN_MODEL = "@cf/black-forest-labs/flux-1-schnell";
/** Social-card shape (1200 × 630). FLUX returns a square, which is centre-cropped to this ratio. */
export const FEATURED_RATIO = 1200 / 630;
const MAX_PROMPT_CHARS = 2048;
const STEPS = 8; // the model's maximum: best quality, still a few Neurons per step
const TIMEOUT_MS = 60_000;

export type ImageGenConfig = { accountId: string; token: string; dailyLimit: number };

const envSchema = z.object({
  CLOUDFLARE_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/i, "CLOUDFLARE_ACCOUNT_ID must be the 32-character account id"),
  CLOUDFLARE_AI_TOKEN: z.string().min(20),
  IMAGE_GEN_DAILY_LIMIT: z.coerce.number().int().min(1).max(500).default(20),
});

/** Null when image generation is not configured (both credentials missing). Throws on a half or invalid setup. */
export function imageGenConfig(source: Record<string, string | undefined> = process.env): ImageGenConfig | null {
  if (!source.CLOUDFLARE_ACCOUNT_ID && !source.CLOUDFLARE_AI_TOKEN) return null;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ImageError(`Image generation is misconfigured: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return { accountId: parsed.data.CLOUDFLARE_ACCOUNT_ID, token: parsed.data.CLOUDFLARE_AI_TOKEN, dailyLimit: parsed.data.IMAGE_GEN_DAILY_LIMIT };
}

/** Style words that make FLUX draw instead of photograph; older agent prompts (and people) still use them. */
const DRAWN_STYLE = /\b(?:(?:flat|vector|cartoon|isometric|minimalist|hand-drawn|digital)\s+)*(?:illustration|drawing|vector art|clip ?art|cartoon|3d render|rendering)s?\b/gi;
const PHOTO_PREFIX = "Photorealistic editorial stock photograph, as if taken with a professional camera: ";
const PHOTO_SUFFIX =
  ". Natural light, realistic textures, colours and proportions, shallow depth of field, wide landscape composition with the " +
  "main subject centred. Not an illustration, drawing, cartoon, 3D render or vector art. No text, letters, numbers, logos, " +
  "watermarks or recognisable brands.";

/**
 * Turns the agent's image prompt into a photorealistic one: drawing-style words become "photograph", and guard rails
 * keep (garbled) text, logos and brands out of blog covers.
 */
export function buildImagePrompt(prompt: string): string {
  const base = prompt.trim().replace(/\s+/g, " ").replace(DRAWN_STYLE, "photograph").replace(/[.\s]+$/, "");
  const room = MAX_PROMPT_CHARS - PHOTO_PREFIX.length - PHOTO_SUFFIX.length;
  return `${PHOTO_PREFIX}${base.slice(0, room)}${PHOTO_SUFFIX}`;
}

const responseSchema = z.object({
  success: z.boolean().optional(),
  result: z.object({ image: z.string().min(100) }),
});
const errorSchema = z.object({ errors: z.array(z.object({ message: z.string() })).default([]) }).passthrough();

/** Centre-crops to FEATURED_RATIO without enlarging. */
export async function cropToFeatured(input: Buffer): Promise<Buffer> {
  const img = sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
  const { width = 0, height = 0 } = await img.metadata();
  if (!width || !height) throw new ImageError("The generated image could not be read");
  const cropW = width / height > FEATURED_RATIO ? Math.round(height * FEATURED_RATIO) : width;
  const cropH = width / height > FEATURED_RATIO ? height : Math.round(width / FEATURED_RATIO);
  return img
    .extract({ left: Math.floor((width - cropW) / 2), top: Math.floor((height - cropH) / 2), width: cropW, height: cropH })
    .png()
    .toBuffer();
}

/** Generates, crops and optimises a featured image (WebP under 400 KB). Throws ImageError with an actionable message. */
export async function generateFeaturedImage(
  prompt: string,
  config: ImageGenConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<OptimizedImage & { model: string }> {
  if (prompt.trim().length < 10) throw new ImageError("Write an image prompt of at least 10 characters");
  let res: Response;
  try {
    res = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${IMAGE_GEN_MODEL}`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt: buildImagePrompt(prompt), steps: STEPS }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ImageError(timedOut ? "Image generation timed out; try again or upload an image" : "Could not reach Cloudflare Workers AI; try again or upload an image");
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = errorSchema.safeParse(body).data?.errors.map((e) => e.message).join("; ");
    if (res.status === 401 || res.status === 403) throw new ImageError("Cloudflare rejected the token: check CLOUDFLARE_AI_TOKEN has the Workers AI permission");
    if (res.status === 429) throw new ImageError("The free daily image allowance is used up (it resets at 01:00 Lagos time); upload an image instead");
    throw new ImageError(`Image generation failed (Cloudflare ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""})`);
  }
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new ImageError("Cloudflare returned no image; try a different prompt");
  const raw = Buffer.from(parsed.data.result.image, "base64");
  if (raw.length === 0 || raw.length > 10 * 1024 * 1024) throw new ImageError("Cloudflare returned an unusable image");

  const optimized = await optimizeImage(await cropToFeatured(raw));
  return { ...optimized, model: IMAGE_GEN_MODEL };
}
