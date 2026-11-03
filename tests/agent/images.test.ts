import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { ImageError, MAX_IMAGE_BYTES, optimizeImage } from "@/lib/blog-agent/images";

/** A photo-like JPEG that compresses badly: random noise over a gradient (like a real camera upload). */
async function noisyPhoto(width: number, height: number): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i += 3) {
    const x = (i / 3) % width;
    pixels[i] = (x * 255) / width + Math.random() * 60;
    pixels[i + 1] = Math.random() * 255;
    pixels[i + 2] = 128 + Math.random() * 100;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
}

describe("optimizeImage", () => {
  it("turns a large photo-like upload into WebP under 400 KB, resized to at most 1600 px", async () => {
    const input = await noisyPhoto(2400, 1600);
    expect(input.length).toBeGreaterThan(MAX_IMAGE_BYTES * 3);
    expect(input.length).toBeLessThan(4 * 1024 * 1024);
    const out = await optimizeImage(input);
    expect(out.bytes).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
    expect(out.data.length).toBe(out.bytes);
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(1600);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined(); // metadata stripped
  }, 60_000);

  it("never enlarges a small-but-valid image and keeps simple images at high quality", async () => {
    const flat = await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#0f766e" } }).png().toBuffer();
    const out = await optimizeImage(flat);
    expect(out).toMatchObject({ width: 1200, height: 630, quality: 82 });
    expect(out.bytes).toBeLessThan(50 * 1024);
  });

  it("rejects non-images, tiny images and oversized uploads", async () => {
    await expect(optimizeImage(Buffer.from("not an image"))).rejects.toThrow(ImageError);
    const tiny = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#fff" } }).png().toBuffer();
    await expect(optimizeImage(tiny)).rejects.toThrow(/too small/);
    await expect(optimizeImage(Buffer.alloc(5 * 1024 * 1024))).rejects.toThrow(/larger than 4 MB/);
  });
});
