import { z } from "zod";
import { ImageError } from "./images";

/**
 * Stock-photo fallback for featured images: real photographs from Pexels or Pixabay (both free for commercial use).
 * Whichever key is set is used (Pexels first). Both providers' API terms are followed: the picker credits the
 * library and the photographer, Pixabay search responses are cached for up to 24 hours, and chosen photos are
 * downloaded to our own storage (Pixabay forbids permanent hotlinking). Optional: with no key, no stock search.
 */
export type StockProvider = "pexels" | "pixabay";
export type StockConfig = { provider: StockProvider; apiKey: string };

export type StockPhoto = {
  provider: StockProvider;
  id: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pageUrl: string;
  thumbUrl: string;
};

export const PROVIDER_INFO: Record<StockProvider, { name: string; home: string; credit: string }> = {
  pexels: { name: "Pexels", home: "https://www.pexels.com", credit: "Photos provided by Pexels" },
  pixabay: { name: "Pixabay", home: "https://pixabay.com", credit: "Images from Pixabay" },
};

const TIMEOUT_MS = 15_000;
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
/** Pixabay asks for requests to be cached for 24 h; its preview URLs last 24 h, so stay just under. */
const PIXABAY_CACHE_SECONDS = 23 * 60 * 60;

export function stockPhotoConfig(source: Record<string, string | undefined> = process.env): StockConfig | null {
  const pexels = source.PEXELS_API_KEY?.trim();
  if (pexels) return { provider: "pexels", apiKey: pexels };
  const pixabay = source.PIXABAY_API_KEY?.trim();
  if (pixabay) return { provider: "pixabay", apiKey: pixabay };
  return null;
}

async function getJson(url: string, init: RequestInit & { next?: { revalidate: number } }, provider: StockProvider, fetchImpl: typeof fetch) {
  const name = PROVIDER_INFO[provider].name;
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ImageError(`Could not reach ${name}; try again or upload an image`);
  }
  const keyEnv = provider === "pexels" ? "PEXELS_API_KEY" : "PIXABAY_API_KEY";
  if (res.status === 401 || res.status === 403) throw new ImageError(`${name} rejected the API key: check ${keyEnv}`);
  if (res.status === 429) throw new ImageError(`The ${name} rate limit is used up; try again later or upload an image`);
  if (res.status === 404) throw new ImageError(`That ${name} photo no longer exists; pick another`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Pixabay answers a bad key with 400 "[ERROR 400] Invalid or missing API key".
    if (/api key/i.test(text)) throw new ImageError(`${name} rejected the API key: check ${keyEnv}`);
    throw new ImageError(`${name} returned an error (${res.status}); try again`);
  }
  return res.json().catch(() => {
    throw new ImageError(`${name} returned an unreadable response; try again`);
  });
}

async function download(src: string, allowedHost: (host: string) => boolean, fetchImpl: typeof fetch): Promise<Buffer> {
  const url = new URL(src);
  if (url.protocol !== "https:" || !allowedHost(url.hostname)) throw new ImageError("Unexpected image location; pick another photo");
  let res: Response;
  try {
    res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new ImageError("Could not download the photo; try again");
  }
  if (!res.ok) throw new ImageError(`Could not download the photo (${res.status}); try again`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_DOWNLOAD_BYTES) throw new ImageError("The photo is too large to download");
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length === 0 || data.length > MAX_DOWNLOAD_BYTES) throw new ImageError("The photo download was empty or too large");
  return data;
}

// --- Pexels ------------------------------------------------------------------

const pexelsPhoto = z.object({
  id: z.number().int(),
  url: z.string().url(),
  photographer: z.string(),
  photographer_url: z.string().url(),
  alt: z.string().nullable().optional(),
  src: z.object({ landscape: z.string().url(), medium: z.string().url() }).passthrough(),
});

const fromPexels = (p: z.infer<typeof pexelsPhoto>): StockPhoto => ({
  provider: "pexels", id: p.id, alt: (p.alt ?? "").trim(), photographer: p.photographer,
  photographerUrl: p.photographer_url, pageUrl: p.url, thumbUrl: p.src.medium,
});

// --- Pixabay -----------------------------------------------------------------

const pixabayHit = z.object({
  id: z.number().int(),
  pageURL: z.string().url(),
  tags: z.string().default(""),
  webformatURL: z.string().url(),
  largeImageURL: z.string().url(),
  user: z.string(),
  user_id: z.number().int(),
});
const pixabayResponse = z.object({ hits: z.array(pixabayHit) });
const isPixabayHost = (h: string) => h === "pixabay.com" || h.endsWith(".pixabay.com");

const fromPixabay = (h: z.infer<typeof pixabayHit>): StockPhoto => ({
  provider: "pixabay", id: h.id, alt: "", photographer: h.user,
  photographerUrl: `https://pixabay.com/users/${encodeURIComponent(h.user)}-${h.user_id}/`, pageUrl: h.pageURL, thumbUrl: h.webformatURL,
});

// --- Public API ----------------------------------------------------------------

/** Landscape photos for a query (most relevant first). */
export async function searchStockPhotos(query: string, config: StockConfig, fetchImpl: typeof fetch = fetch): Promise<StockPhoto[]> {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 100);
  if (q.length < 2) throw new ImageError("Type at least two characters to search");

  if (config.provider === "pexels") {
    const params = new URLSearchParams({ query: q, orientation: "landscape", size: "medium", per_page: "15" });
    const body = await getJson(`https://api.pexels.com/v1/search?${params}`, { headers: { authorization: config.apiKey }, cache: "no-store" }, "pexels", fetchImpl);
    const parsed = z.object({ photos: z.array(pexelsPhoto) }).safeParse(body);
    if (!parsed.success) throw new ImageError("Pexels returned an unexpected response; try again");
    return parsed.data.photos.map(fromPexels);
  }

  const params = new URLSearchParams({
    key: config.apiKey, q, image_type: "photo", orientation: "horizontal", min_width: "1200", safesearch: "true", per_page: "15", lang: "en",
  });
  const body = await getJson(`https://pixabay.com/api/?${params}`, { next: { revalidate: PIXABAY_CACHE_SECONDS } }, "pixabay", fetchImpl);
  const parsed = pixabayResponse.safeParse(body);
  if (!parsed.success) throw new ImageError("Pixabay returned an unexpected response; try again");
  return parsed.data.hits.map(fromPixabay);
}

/**
 * Downloads a chosen photo from the provider's own image host only: Pexels' 1200 × 627 landscape crop, or
 * Pixabay's large (≤1280 px) image. The caller crops to the social-card shape and converts to WebP.
 */
export async function downloadStockPhoto(id: number, config: StockConfig, fetchImpl: typeof fetch = fetch): Promise<{ data: Buffer; photo: StockPhoto }> {
  if (!Number.isInteger(id) || id <= 0) throw new ImageError("Invalid photo");

  if (config.provider === "pexels") {
    const body = await getJson(`https://api.pexels.com/v1/photos/${id}`, { headers: { authorization: config.apiKey }, cache: "no-store" }, "pexels", fetchImpl);
    const parsed = pexelsPhoto.safeParse(body);
    if (!parsed.success) throw new ImageError("Pexels returned an unexpected response; try again");
    const data = await download(parsed.data.src.landscape, (h) => h === "images.pexels.com", fetchImpl);
    return { data, photo: fromPexels(parsed.data) };
  }

  const params = new URLSearchParams({ key: config.apiKey, id: String(id) });
  const body = await getJson(`https://pixabay.com/api/?${params}`, { next: { revalidate: PIXABAY_CACHE_SECONDS } }, "pixabay", fetchImpl);
  const parsed = pixabayResponse.safeParse(body);
  if (!parsed.success) throw new ImageError("Pixabay returned an unexpected response; try again");
  const hit = parsed.data.hits[0];
  if (!hit) throw new ImageError("That Pixabay photo no longer exists; pick another");
  const data = await download(hit.largeImageURL, isPixabayHost, fetchImpl);
  return { data, photo: fromPixabay(hit) };
}

/** The library's description as alt text (Pexels only; Pixabay has tags, not sentences), trimmed to 125 characters. */
export function altFromStockPhoto(photo: StockPhoto): string {
  const alt = photo.alt.replace(/\s+/g, " ").trim();
  if (alt.length <= 125) return alt;
  const cut = alt.slice(0, 125);
  return cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : 125).replace(/[,;:\s]+$/, "");
}
