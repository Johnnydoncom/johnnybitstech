import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { buildImagePrompt, cropToFeatured, FEATURED_RATIO, generateFeaturedImage, IMAGE_GEN_MODEL, imageGenConfig } from "@/lib/blog-agent/image-gen";
import { ImageError, MAX_IMAGE_BYTES } from "@/lib/blog-agent/images";

const ACCOUNT = "0123456789abcdef0123456789abcdef";
const config = { accountId: ACCOUNT, token: "t".repeat(40), dailyLimit: 20 };

/** A photo-like square JPEG, like FLUX's 1024 × 1024 output. */
async function fluxLikeImage(size = 1024): Promise<string> {
  const px = Buffer.alloc(size * size * 3);
  for (let i = 0; i < px.length; i += 3) {
    const x = (i / 3) % size;
    px[i] = (x * 255) / size + Math.random() * 40;
    px[i + 1] = 120 + Math.random() * 80;
    px[i + 2] = 140 + Math.random() * 60;
  }
  return (await sharp(px, { raw: { width: size, height: size, channels: 3 } }).jpeg({ quality: 90 }).toBuffer()).toString("base64");
}

type Call = { url: string; init: RequestInit };
function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof fetch;
  return { impl, calls };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function imageError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ImageError) return e.message;
    throw e;
  }
  throw new Error("Expected an ImageError");
}

describe("image generation config", () => {
  it("is off without credentials, strict when half set, parsed when complete", () => {
    expect(imageGenConfig({})).toBeNull();
    expect(() => imageGenConfig({ CLOUDFLARE_ACCOUNT_ID: ACCOUNT })).toThrow(/CLOUDFLARE_AI_TOKEN/);
    expect(() => imageGenConfig({ CLOUDFLARE_ACCOUNT_ID: "not-an-id", CLOUDFLARE_AI_TOKEN: "t".repeat(40) })).toThrow(/32-character/);
    expect(imageGenConfig({ CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_TOKEN: "t".repeat(40) })).toEqual({ accountId: ACCOUNT, token: "t".repeat(40), dailyLimit: 20 });
    expect(imageGenConfig({ CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_TOKEN: "t".repeat(40), IMAGE_GEN_DAILY_LIMIT: "5" })?.dailyLimit).toBe(5);
  });

  it("adds the no-text guard rails and stays within the model's 2,048-character limit", () => {
    const p = buildImagePrompt("  Flat illustration of a laptop   with a naira price tag. ");
    expect(p).toMatch(/^Flat illustration of a laptop with a naira price tag\. Wide landscape/);
    expect(p).toContain("No text, letters, numbers, logos or watermarks.");
    expect(buildImagePrompt("x".repeat(5000)).length).toBeLessThanOrEqual(2048);
  });
});

describe("generateFeaturedImage", () => {
  it("calls Workers AI, crops the square to 1.91:1 and returns WebP under 400 KB", async () => {
    const image = await fluxLikeImage();
    const { impl, calls } = fakeFetch(() => json(200, { success: true, result: { image } }));
    const out = await generateFeaturedImage("Flat illustration of a laptop with a naira price tag", config, impl);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${IMAGE_GEN_MODEL}`);
    expect(new Headers(calls[0].init.headers).get("authorization")).toBe(`Bearer ${config.token}`);
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.steps).toBe(8);
    expect(body.prompt).toContain("No text");

    expect(out.model).toBe(IMAGE_GEN_MODEL);
    expect(out.bytes).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
    expect((await sharp(out.data).metadata()).format).toBe("webp");
    expect(out.width).toBe(1024);
    expect(Math.abs(out.width / out.height - FEATURED_RATIO)).toBeLessThan(0.01);
  });

  it("turns Cloudflare failures into messages the admin can act on", async () => {
    const run = (r: () => Response | Promise<Response>) => imageError(generateFeaturedImage("A valid image prompt here", config, fakeFetch(r).impl));
    expect(await run(() => json(401, { errors: [{ message: "Authentication error" }] }))).toMatch(/CLOUDFLARE_AI_TOKEN/);
    expect(await run(() => json(429, { errors: [{ message: "Daily limit" }] }))).toMatch(/free daily image allowance/);
    expect(await run(() => json(500, { errors: [{ message: "Model overloaded" }] }))).toBe("Image generation failed (Cloudflare 500: Model overloaded)");
    expect(await run(() => json(200, { success: true, result: {} }))).toMatch(/returned no image/);
    expect(await run(() => new Response("not json", { status: 502 }))).toBe("Image generation failed (Cloudflare 502)");
    expect(await run(() => Promise.reject(new TypeError("fetch failed")))).toMatch(/Could not reach Cloudflare/);
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    expect(await run(() => Promise.reject(timeout))).toMatch(/timed out/);
    expect(await imageError(generateFeaturedImage("short", config, fakeFetch(() => json(200, {})).impl))).toMatch(/at least 10 characters/);
  });
});

describe("cropToFeatured", () => {
  it("centre-crops tall and wide images to the social-card ratio without enlarging", async () => {
    const tall = await sharp({ create: { width: 800, height: 1200, channels: 3, background: "#0aa" } }).png().toBuffer();
    const wide = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: "#0aa" } }).png().toBuffer();
    expect(await sharp(await cropToFeatured(tall)).metadata()).toMatchObject({ width: 800, height: 420 });
    expect(await sharp(await cropToFeatured(wide)).metadata()).toMatchObject({ width: 1905, height: 1000 });
  });
});
