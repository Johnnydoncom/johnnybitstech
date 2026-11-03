import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { ImageError } from "@/lib/blog-agent/images";
import { altFromStockPhoto, downloadStockPhoto, searchStockPhotos, stockPhotoConfig, type StockPhoto } from "@/lib/blog-agent/stock-photos";

const config = { provider: "pexels" as const, apiKey: "pexels-test-key" };
const pixabay = { provider: "pixabay" as const, apiKey: "pixabay-test-key" };
const photo = (id: number, extra: Record<string, unknown> = {}) => ({
  id, width: 6000, height: 4000, url: `https://www.pexels.com/photo/office-${id}/`, photographer: "Ada Obi",
  photographer_url: "https://www.pexels.com/@ada", alt: "Woman working on a laptop in a bright office",
  src: { landscape: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=1200&h=627&fit=crop`, medium: `https://images.pexels.com/photos/${id}/m.jpeg`, large2x: `https://images.pexels.com/photos/${id}/l.jpeg` },
  ...extra,
});
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fakeFetch(routes: (url: string) => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return routes(String(url));
  }) as typeof fetch;
  return { impl, calls };
}
async function imageError(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof ImageError) return e.message;
    throw e;
  }
  throw new Error("Expected an ImageError");
}

describe("stock photos (Pexels)", () => {
  it("is off without a key, and prefers Pexels when both keys are set", () => {
    expect(stockPhotoConfig({})).toBeNull();
    expect(stockPhotoConfig({ PEXELS_API_KEY: "  " })).toBeNull();
    expect(stockPhotoConfig({ PEXELS_API_KEY: "abc" })).toEqual({ provider: "pexels", apiKey: "abc" });
    expect(stockPhotoConfig({ PIXABAY_API_KEY: "xyz" })).toEqual({ provider: "pixabay", apiKey: "xyz" });
    expect(stockPhotoConfig({ PEXELS_API_KEY: "abc", PIXABAY_API_KEY: "xyz" })?.provider).toBe("pexels");
  });

  it("searches landscape photos with the key in the Authorization header", async () => {
    const { impl, calls } = fakeFetch(() => json(200, { photos: [photo(1), photo(2, { alt: null })], total_results: 2 }));
    const found = await searchStockPhotos("  small business   owner  ", config, impl);
    expect(found.map((p) => p.id)).toEqual([1, 2]);
    expect(found[1].alt).toBe("");
    const url = new URL(calls[0].url);
    expect(url.origin + url.pathname).toBe("https://api.pexels.com/v1/search");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ query: "small business owner", orientation: "landscape", per_page: "15" });
    expect(new Headers(calls[0].init?.headers).get("authorization")).toBe("pexels-test-key");
  });

  it("downloads the 1200 × 627 landscape crop, and only from images.pexels.com", async () => {
    const jpeg = await sharp({ create: { width: 1200, height: 627, channels: 3, background: "#468" } }).jpeg().toBuffer();
    const ok = fakeFetch((url) => (url.includes("api.pexels.com") ? json(200, photo(7)) : new Response(new Uint8Array(jpeg), { status: 200 })));
    const { data, photo: p } = await downloadStockPhoto(7, config, ok.impl);
    expect(data.length).toBe(jpeg.length);
    expect(p).toMatchObject({ id: 7, photographer: "Ada Obi", pageUrl: "https://www.pexels.com/photo/office-7/" });
    expect(ok.calls[1].url).toContain("images.pexels.com/photos/7/");
    expect(new Headers(ok.calls[1].init?.headers).get("authorization")).toBeNull(); // the key goes to the API only

    const evil = fakeFetch(() => json(200, photo(8, { src: { ...photo(8).src, landscape: "https://evil.example/x.jpg" } })));
    expect(await imageError(downloadStockPhoto(8, config, evil.impl))).toMatch(/Unexpected image location/);
    expect(evil.calls).toHaveLength(1);
  });

  it("explains API failures", async () => {
    const run = (status: number) => imageError(searchStockPhotos("office", config, fakeFetch(() => json(status, {})).impl));
    expect(await run(401)).toMatch(/PEXELS_API_KEY/);
    expect(await run(429)).toMatch(/rate limit/);
    expect(await run(500)).toMatch(/error \(500\)/);
    expect(await imageError(searchStockPhotos("x", config))).toMatch(/at least two characters/);
    expect(await imageError(downloadStockPhoto(9, config, fakeFetch(() => json(404, {})).impl))).toMatch(/no longer exists/);
    expect(await imageError(downloadStockPhoto(-1, config))).toBe("Invalid photo");
    expect(await imageError(searchStockPhotos("office", config, fakeFetch(() => Promise.reject(new TypeError("fetch failed"))).impl))).toMatch(/Could not reach Pexels/);
  });

  it("trims long Pexels descriptions to the 125-character alt limit at a word boundary", () => {
    const base: StockPhoto = { provider: "pexels", id: 1, alt: "", photographer: "", photographerUrl: "", pageUrl: "", thumbUrl: "" };
    expect(altFromStockPhoto({ ...base, alt: "  A   shop   counter " })).toBe("A shop counter");
    const long = altFromStockPhoto({ ...base, alt: "word ".repeat(60) });
    expect(long.length).toBeLessThanOrEqual(125);
    expect(long.endsWith("word")).toBe(true);
  });
});

describe("stock photos (Pixabay)", () => {
  const hit = (id: number, extra: Record<string, unknown> = {}) => ({
    id, pageURL: `https://pixabay.com/photos/office-laptop-${id}/`, type: "photo", tags: "office, laptop, business",
    previewURL: `https://cdn.pixabay.com/photo/p/${id}_150.jpg`, webformatURL: `https://pixabay.com/get/${id}_640.jpg`,
    largeImageURL: `https://pixabay.com/get/${id}_1280.jpg`, user: "chidi", user_id: 42, ...extra,
  });

  it("searches real photos only (no illustrations), landscape, safe, at least 1200 px wide, cached for under 24 h", async () => {
    const { impl, calls } = fakeFetch(() => json(200, { total: 1, totalHits: 1, hits: [hit(5)] }));
    const found = await searchStockPhotos("market stall Lagos", pixabay, impl);
    expect(found).toEqual([{
      provider: "pixabay", id: 5, alt: "", photographer: "chidi", photographerUrl: "https://pixabay.com/users/chidi-42/",
      pageUrl: "https://pixabay.com/photos/office-laptop-5/", thumbUrl: "https://pixabay.com/get/5_640.jpg",
    }]);
    const url = new URL(calls[0].url);
    expect(url.origin + url.pathname).toBe("https://pixabay.com/api/");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ key: "pixabay-test-key", q: "market stall Lagos", image_type: "photo", orientation: "horizontal", min_width: "1200", safesearch: "true" });
    expect((calls[0].init as { next?: { revalidate: number } }).next?.revalidate).toBeLessThan(24 * 3600);
  });

  it("downloads the large image by id from Pixabay's hosts only", async () => {
    const jpeg = await sharp({ create: { width: 1280, height: 853, channels: 3, background: "#864" } }).jpeg().toBuffer();
    const ok = fakeFetch((url) => (url.startsWith("https://pixabay.com/api/") ? json(200, { hits: [hit(9)] }) : new Response(new Uint8Array(jpeg))));
    const { data, photo } = await downloadStockPhoto(9, pixabay, ok.impl);
    expect(data.length).toBe(jpeg.length);
    expect(photo.photographer).toBe("chidi");
    expect(new URL(ok.calls[0].url).searchParams.get("id")).toBe("9");
    expect(ok.calls[1].url).toBe("https://pixabay.com/get/9_1280.jpg");

    const evil = fakeFetch(() => json(200, { hits: [hit(9, { largeImageURL: "https://pixabay.com.evil.example/x.jpg" })] }));
    expect(await imageError(downloadStockPhoto(9, pixabay, evil.impl))).toMatch(/Unexpected image location/);
    expect(await imageError(downloadStockPhoto(9, pixabay, fakeFetch(() => json(200, { hits: [] })).impl))).toMatch(/no longer exists/);
  });

  it("explains a bad key, which Pixabay reports as HTTP 400 with text", async () => {
    const bad = fakeFetch(() => new Response("[ERROR 400] Invalid or missing API key", { status: 400 }));
    expect(await imageError(searchStockPhotos("office", pixabay, bad.impl))).toMatch(/PIXABAY_API_KEY/);
  });
});
