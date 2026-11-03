import { describe, expect, it } from "vitest";
import { buildSeoPackage } from "@/lib/blog-agent/seo/package";
import { containsKeyword, fleschReadingEase, keywordDensity, syllables } from "@/lib/blog-agent/seo/metrics";
import { slugify, uniqueSlug } from "@/lib/blog-agent/seo/slug";
import { createTestDb } from "../helpers/db";
import * as fx from "../fixtures/stages";

describe("slugs", () => {
  it("slugifies titles and trims on a word boundary", () => {
    expect(slugify("Website Cost in Nigeria (2026)!")).toBe("website-cost-in-nigeria-2026");
    expect(slugify("Café & Bar")).toBe("cafe-and-bar");
    expect(slugify("word ".repeat(40)).length).toBeLessThanOrEqual(80);
  });

  it("picks the first free slug across all articles", async () => {
    const t = await createTestDb();
    try {
      expect(await uniqueSlug(t.db, "website-cost-in-nigeria")).toBe("website-cost-in-nigeria");
      await t.exec.query("INSERT INTO articles (title, slug) VALUES ('a', 'website-cost-in-nigeria'), ('b', 'website-cost-in-nigeria-2')");
      expect(await uniqueSlug(t.db, "website-cost-in-nigeria")).toBe("website-cost-in-nigeria-3");
    } finally {
      await t.close();
    }
  });
});

describe("metrics", () => {
  it("counts syllables and scores readability", () => {
    expect(syllables("cost")).toBe(1);
    expect(syllables("website")).toBe(2);
    expect(syllables("integration")).toBeGreaterThanOrEqual(4);
    expect(fleschReadingEase("The cat sat on the mat. It was fun.")).toBeGreaterThan(fleschReadingEase("Comprehensive infrastructure modernisation necessitates considerable organisational transformation."));
  });

  it("measures keyword density on normalised text", () => {
    const d = keywordDensity("Website cost in Nigeria varies. The website cost in Nigeria, explained.", "website cost in Nigeria");
    expect(d.occurrences).toBe(2);
    expect(d.densityPercent).toBeCloseTo(72.7, 0);
    expect(containsKeyword("How much does a website cost in Lagos, Nigeria?", "website cost in Nigeria")).toBe(true);
    expect(containsKeyword("Hosting plans", "website cost in Nigeria")).toBe(false);
  });
});

describe("buildSeoPackage", () => {
  const pkg = buildSeoPackage({
    title: fx.s6.title,
    markdown: fx.s6.markdown,
    primaryKeyword: fx.s1.primary_keyword,
    seo: { ...fx.s7, og_title: undefined, og_description: undefined },
    slug: "website-cost-in-nigeria",
    author: { name: "Odoh John", slug: "odoh-john", jobTitle: "Software Developer", url: null, sameAs: [] },
    includeFaq: true,
  });

  it("computes canonical, JSON-LD and metrics in code", () => {
    expect(pkg.canonical).toBe("https://johnnybits.com/blog/website-cost-in-nigeria");
    const graph = pkg.schema_jsonld["@graph"] as Record<string, unknown>[];
    expect(graph.find((n) => n["@type"] === "BlogPosting")).toMatchObject({ headline: fx.s6.title, url: pkg.canonical });
    expect(graph.find((n) => n["@type"] === "FAQPage")).toBeDefined();
    expect(pkg.metrics).toMatchObject({ word_count: 742, reading_minutes: 3, h2_count: 5 });
    expect(pkg.metrics.keyword).toMatchObject({ in_title: true, in_slug: true, in_first_100_words: true, in_an_h2: true });
    expect(pkg.og_title).toBe(fx.s7.meta_title);
  });
});
