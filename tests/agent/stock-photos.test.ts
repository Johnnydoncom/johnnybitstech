import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { ImageError } from "@/lib/blog-agent/images";
import { altFromStockPhoto, downloadStockPhoto, searchStockPhotos, stockPhotoConfig, type StockPhoto } from "@/lib/blog-agent/stock-photos";

const config = { apiKey: "pexels-test-key" };
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
  it("is off without a key", () => {
    expect(stockPhotoConfig({})).toBeNull();
    expect(stockPhotoConfig({ PEXELS_API_KEY: "  " })).toBeNull();
    expect(stockPhotoConfig({ PEXELS_API_KEY: "abc" })).toEqual({ apiKey: "abc" });
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
    expect(await run(429)).toMatch(/hourly limit/);
    expect(await run(500)).toMatch(/error \(500\)/);
    expect(await imageError(searchStockPhotos("x", config))).toMatch(/at least two characters/);
    expect(await imageError(downloadStockPhoto(9, config, fakeFetch(() => json(404, {})).impl))).toMatch(/no longer exists/);
    expect(await imageError(downloadStockPhoto(-1, config))).toBe("Invalid photo");
    expect(await imageError(searchStockPhotos("office", config, fakeFetch(() => Promise.reject(new TypeError("fetch failed"))).impl))).toMatch(/Could not reach Pexels/);
  });

  it("trims long Pexels descriptions to the 125-character alt limit at a word boundary", () => {
    const base: StockPhoto = { id: 1, alt: "", photographer: "", photographerUrl: "", pageUrl: "", thumbUrl: "" };
    expect(altFromStockPhoto({ ...base, alt: "  A   shop   counter " })).toBe("A shop counter");
    const long = altFromStockPhoto({ ...base, alt: "word ".repeat(60) });
    expect(long.length).toBeLessThanOrEqual(125);
    expect(long.endsWith("word")).toBe(true);
  });
});
