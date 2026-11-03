import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const put = vi.fn();
let session: { email: string } | null = { email: "admin@johnnybits.com" };
vi.mock("@vercel/blob", () => ({ put }));
vi.mock("@/lib/auth", () => ({ verifySession: async () => session }));

const SITE = "https://johnnybits.com";
async function upload(file: Blob | null, opts: { origin?: string | null; slug?: string } = {}) {
  const body = new FormData();
  if (file) body.set("image", file, "photo.jpg");
  if (opts.slug !== undefined) body.set("slug", opts.slug);
  const origin = opts.origin === undefined ? SITE : opts.origin;
  const { POST } = await import("@/app/api/admin/blog/image/route");
  const res = await POST(new Request(`${SITE}/api/admin/blog/image`, { method: "POST", headers: { host: "johnnybits.com", ...(origin ? { origin } : {}) }, body }));
  return { status: res.status, json: await res.json() };
}
const jpeg = async (w: number, h: number) => new Blob([new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: "#0aa" } }).jpeg().toBuffer())], { type: "image/jpeg" });

beforeEach(() => {
  session = { email: "admin@johnnybits.com" };
  put.mockReset();
  put.mockImplementation(async (path: string) => ({ url: `https://abc123.public.blob.vercel-storage.com/${path.replace(".webp", "-x1.webp")}` }));
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/admin/blog/image", () => {
  it("converts the upload to WebP under 400 KB and stores it under the post's slug", async () => {
    const { status, json } = await upload(await jpeg(2000, 1050), { slug: "website-cost-in-nigeria" });
    expect(status).toBe(200);
    expect(json.url).toBe("https://abc123.public.blob.vercel-storage.com/blog/website-cost-in-nigeria-x1.webp");
    expect(json.bytes).toBeLessThanOrEqual(400 * 1024);
    expect(Math.max(json.width, json.height)).toBeLessThanOrEqual(1600);
    const [path, data, options] = put.mock.calls[0];
    expect(path).toBe("blog/website-cost-in-nigeria.webp");
    expect((await sharp(data).metadata()).format).toBe("webp");
    expect(options).toMatchObject({ access: "public", contentType: "image/webp", addRandomSuffix: true });
  });

  it("works with an OIDC-connected store (BLOB_STORE_ID, no read-write token), the default for new stores", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "store_abc123");
    const { status } = await upload(await jpeg(1200, 630), { slug: "oidc-store" });
    expect(status).toBe(200);
    expect(put.mock.calls[0][0]).toBe("blog/oidc-store.webp");
  });

  it("falls back to a safe file name when the slug is missing or unsafe", async () => {
    await upload(await jpeg(1200, 630), { slug: "../../etc/passwd" });
    expect(put.mock.calls[0][0]).toBe("blog/post.webp");
  });

  it("refuses cross-site requests, signed-out users, missing storage, non-images and tiny images", async () => {
    expect((await upload(await jpeg(1200, 630), { origin: "https://evil.example" })).status).toBe(403);
    session = null;
    expect((await upload(await jpeg(1200, 630))).status).toBe(401);
    session = { email: "admin@johnnybits.com" };
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    expect((await upload(await jpeg(1200, 630))).json.error).toMatch(/Connect Project/);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
    expect(await upload(new Blob(["not an image"], { type: "image/jpeg" }))).toEqual({ status: 400, json: { error: "That file is not a readable image" } });
    expect((await upload(await jpeg(300, 200))).json.error).toMatch(/too small/);
    expect((await upload(null)).json.error).toBe("Choose an image file");
    expect(put).not.toHaveBeenCalled();
  });
});
