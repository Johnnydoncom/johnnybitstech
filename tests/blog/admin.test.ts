import { describe, expect, it } from "vitest";
import { isUniqueViolation, legacyInputToArticle, legacyPostInput } from "@/lib/blog/admin";

const valid = { title: " A title ", slug: "a-title", content: "<p>one two three</p>", published: true };

describe("legacy admin input", () => {
  it("accepts the existing editor payload and normalises blanks to null", () => {
    const parsed = legacyPostInput.parse({ ...valid, excerpt: "", tag: "  ", meta_title: "M" });
    expect(parsed).toMatchObject({ title: "A title", excerpt: null, tag: null, meta_title: "M", published: true });
  });

  it.each(["Has Spaces", "double--hyphen", "-leading", "UPPER_case"])("rejects slug %s", (slug) => {
    expect(legacyPostInput.safeParse({ ...valid, slug }).success).toBe(false);
  });

  it("rejects non-https external images", () => {
    expect(legacyPostInput.safeParse({ ...valid, featured_image: "http://x.com/a.png" }).success).toBe(false);
    expect(legacyPostInput.safeParse({ ...valid, featured_image: "/assets/blog/a.png" }).success).toBe(true);
  });

  it("stores HTML with computed word count and read time", () => {
    const article = legacyInputToArticle(legacyPostInput.parse(valid));
    expect(article).toMatchObject({ contentFormat: "html", wordCount: 3, readingMinutes: 1 });
  });

  it("detects unique violations wrapped by drivers", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation(new Error("x", { cause: { code: "23505" } }))).toBe(true);
    expect(isUniqueViolation(new Error("x"))).toBe(false);
  });
});
