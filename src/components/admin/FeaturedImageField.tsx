"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Featured image for the Blog Posts form: paste a URL or upload a file. Uploads are converted on the server to
 * WebP under 400 KB and the resulting URL fills the `featured_image` field, which the form saves as before.
 */
export default function FeaturedImageField({ defaultValue = "" }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("image", file);
      const slug = (fileRef.current?.form?.elements.namedItem("slug") as HTMLInputElement | null)?.value;
      if (slug) body.set("slug", slug);
      const res = await fetch("/api/admin/blog/image", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; bytes?: number; width?: number; height?: number; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setUrl(data.url);
      setMessage({ kind: "ok", text: `Uploaded as WebP: ${Math.round((data.bytes ?? 0) / 1024)} KB, ${data.width}×${data.height}. Save the post to keep it.` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <Label htmlFor="featured_image">Featured Image</Label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <Input
          id="featured_image"
          name="featured_image"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Upload an image, or paste a URL such as /assets/blog/image.webp"
          className="flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          aria-label="Featured image file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        JPEG, PNG, WebP or AVIF up to 4 MB, at least 600 × 315 (1200 × 630 is ideal). Saved as WebP under 400 KB.
      </p>
      {message && (
        <p className={`mt-1.5 text-xs ${message.kind === "error" ? "text-destructive" : "text-emerald-700"}`} role="status">
          {message.text}
        </p>
      )}
      {url && (
        <div className="relative mt-3 w-full max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary URL */}
          <img src={url} alt="Featured image preview" className="aspect-[1200/630] w-full rounded-lg border border-border object-cover" />
          <button
            type="button"
            onClick={() => setUrl("")}
            className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
            aria-label="Remove featured image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
