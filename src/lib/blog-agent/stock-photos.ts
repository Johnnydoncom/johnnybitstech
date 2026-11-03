import { z } from "zod";
import { ImageError } from "./images";

/**
 * Stock-photo fallback for featured images: real photographs from Pexels (free for commercial use, no attribution
 * required by the licence). Pexels' API guidelines ask apps to link to Pexels and credit photographers, which the
 * picker does. Optional: without PEXELS_API_KEY the review page offers AI generation and upload only.
 */
const API = "https://api.pexels.com/v1";
const IMAGE_HOST = "images.pexels.com";
const TIMEOUT_MS = 15_000;
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;

export type StockConfig = { apiKey: string };

export function stockPhotoConfig(source: Record<string, string | undefined> = process.env): StockConfig | null {
  const key = source.PEXELS_API_KEY?.trim();
  return key ? { apiKey: key } : null;
}

const photoSchema = z.object({
  id: z.number().int(),
  width: z.number(),
  height: z.number(),
  url: z.string().url(),
  photographer: z.string(),
  photographer_url: z.string().url(),
  alt: z.string().nullable().optional(),
  src: z.object({ landscape: z.string().url(), medium: z.string().url(), large2x: z.string().url() }).passthrough(),
});
const searchSchema = z.object({ photos: z.array(photoSchema), total_results: z.number().optional() });

export type StockPhoto = {
  id: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pageUrl: string;
  thumbUrl: string;
};

function toPhoto(p: z.infer<typeof photoSchema>): StockPhoto {
  return { id: p.id, alt: (p.alt ?? "").trim(), photographer: p.photographer, photographerUrl: p.photographer_url, pageUrl: p.url, thumbUrl: p.src.medium };
}

async function call(path: string, config: StockConfig, fetchImpl: typeof fetch): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(`${API}${path}`, { headers: { authorization: config.apiKey }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new ImageError("Could not reach Pexels; try again or upload an image");
  }
  if (res.status === 401 || res.status === 403) throw new ImageError("Pexels rejected the API key: check PEXELS_API_KEY");
  if (res.status === 429) throw new ImageError("The Pexels hourly limit is used up; try again later or upload an image");
  if (res.status === 404) throw new ImageError("That Pexels photo no longer exists; pick another");
  if (!res.ok) throw new ImageError(`Pexels returned an error (${res.status}); try again`);
  return res.json().catch(() => {
    throw new ImageError("Pexels returned an unreadable response; try again");
  });
}

/** Landscape photos for a query (most relevant first). */
export async function searchStockPhotos(query: string, config: StockConfig, fetchImpl: typeof fetch = fetch): Promise<StockPhoto[]> {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 100);
  if (q.length < 2) throw new ImageError("Type at least two characters to search");
  const params = new URLSearchParams({ query: q, orientation: "landscape", size: "medium", per_page: "15" });
  const parsed = searchSchema.safeParse(await call(`/search?${params}`, config, fetchImpl));
  if (!parsed.success) throw new ImageError("Pexels returned an unexpected response; try again");
  return parsed.data.photos.map(toPhoto);
}

/** Downloads a photo's 1200 × 627 landscape crop (the social-card shape) from Pexels' image host only. */
export async function downloadStockPhoto(
  id: number,
  config: StockConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ data: Buffer; photo: StockPhoto }> {
  if (!Number.isInteger(id) || id <= 0) throw new ImageError("Invalid photo");
  const parsed = photoSchema.safeParse(await call(`/photos/${id}`, config, fetchImpl));
  if (!parsed.success) throw new ImageError("Pexels returned an unexpected response; try again");
  const src = new URL(parsed.data.src.landscape);
  if (src.protocol !== "https:" || src.hostname !== IMAGE_HOST) throw new ImageError("Unexpected image location; pick another photo");

  let res: Response;
  try {
    res = await fetchImpl(src.toString(), { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new ImageError("Could not download the photo; try again");
  }
  if (!res.ok) throw new ImageError(`Could not download the photo (${res.status}); try again`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_DOWNLOAD_BYTES) throw new ImageError("The photo is too large to download");
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length === 0 || data.length > MAX_DOWNLOAD_BYTES) throw new ImageError("The photo download was empty or too large");
  return { data, photo: toPhoto(parsed.data) };
}

/** Pexels alt text, trimmed to the 125-character alt limit at a word boundary. Empty when Pexels has none. */
export function altFromStockPhoto(photo: StockPhoto): string {
  const alt = photo.alt.replace(/\s+/g, " ").trim();
  if (alt.length <= 125) return alt;
  const cut = alt.slice(0, 125);
  return cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : 125).replace(/[,;:\s]+$/, "");
}
