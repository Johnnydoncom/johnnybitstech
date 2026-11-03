import { describe, expect, it } from "vitest";
import { contentShowsImage, renderArticleHtml } from "@/lib/blog/render";

describe("contentShowsImage", () => {
  it("spots the featured image in older posts' HTML, including encoded spaces", () => {
    const html = renderArticleHtml('<p><img src="/assets/portfolio/Incubation World.webp" alt="x"></p><p>Text</p>', "html");
    expect(contentShowsImage(html, "/assets/portfolio/Incubation World.webp")).toBe(true);
    expect(contentShowsImage(html, "/assets/portfolio/Incubation%20World.webp")).toBe(true);
    expect(contentShowsImage(html, "/assets/portfolio/Other.webp")).toBe(false);
  });

  it("is false for agent articles whose Markdown has no image, and true once the same image is in the content", () => {
    const cover = "https://abc123.public.blob.vercel-storage.com/blog/cover-x1.webp";
    expect(contentShowsImage(renderArticleHtml("Intro text.\n\n## Section\n\nBody.", "markdown"), cover)).toBe(false);
    expect(contentShowsImage(renderArticleHtml(`## Section\n\n![Cover](${cover})\n\nBody.`, "markdown"), cover)).toBe(true);
    expect(contentShowsImage(renderArticleHtml("## Section\n\n![Other](https://abc123.public.blob.vercel-storage.com/blog/other.webp)", "markdown"), cover)).toBe(false);
  });
});
