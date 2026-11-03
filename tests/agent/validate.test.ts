import { describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { buildChunks } from "@/lib/blog-agent/indexing/chunks";
import { insertLinks, type TargetType } from "@/lib/blog-agent/linking/insert";
import { validateArticle, type ValidationInput } from "@/lib/blog-agent/qa/validate";
import { buildSeoPackage } from "@/lib/blog-agent/seo/package";
import * as fx from "../fixtures/stages";

const targets = new Map<string, TargetType>([["/ecommerce-web-development", "service"], ["/website-maintenance-and-support", "service"], ["/contact-us", "contact"]]);
const linked = (() => {
  const r = insertLinks(fx.s6.markdown, fx.s8.links, targets, { wordCount: 742, siteOrigin: "https://johnnybits.com" });
  if (!r.ok) throw new Error("fixture links failed");
  return r.markdown;
})();

function input(overrides: { markdown?: string; title?: string; faq?: typeof fx.s7.faq; wordCountTarget?: number } = {}): ValidationInput {
  const markdown = overrides.markdown ?? linked;
  const title = overrides.title ?? fx.s6.title;
  const seo = { ...fx.s7, faq: overrides.faq ?? fx.s7.faq };
  const pkg = buildSeoPackage({ title, markdown, primaryKeyword: fx.s1.primary_keyword, seo, slug: "website-cost-in-nigeria", author: null, includeFaq: true });
  return {
    title, markdown, seo, pkg,
    wordCountTarget: overrides.wordCountTarget ?? fx.s3.word_count_target,
    primaryKeyword: fx.s1.primary_keyword,
    research: fx.s4.items as ValidationInput["research"],
    siteOrigin: "https://johnnybits.com",
    existingPaths: new Set(targets.keys()),
    bannedClaims: getBrandContext().bannedClaims,
  };
}
const messages = (i: ValidationInput) => validateArticle(i).errors.map((e) => e.message);

describe("validateArticle", () => {
  it("passes the fixture article", () => {
    const report = validateArticle(input());
    expect(report.errors).toEqual([]);
    expect(report.passed).toBe(true);
    expect(report.metrics).toMatchObject({ word_count: 742, internal_links: 3, citations: 4 });
  });

  it("requires a citation on every sentence with a figure", () => {
    const md = linked.replace("Launch in phases.", "Launch in phases. Around 40% of small sites are rebuilt within three years.");
    expect(messages(input({ markdown: md }))).toEqual([expect.stringMatching(/^Figure without a citation: "Around 40%/)]);
    const naira = linked.replace("Launch in phases.", "A basic site costs ₦250,000.");
    expect(messages(input({ markdown: naira })).some((m) => /Figure without a citation/.test(m))).toBe(true);
    const cited = linked.replace("Launch in phases.", "Around 40% of small sites are rebuilt.[^r4]");
    expect(messages(input({ markdown: cited }))).toEqual([]);
    const allowed = linked.replace("Launch in phases.", "Book a 30-minute call in 2026.");
    expect(messages(input({ markdown: allowed }))).toEqual([]);
  });

  it("blocks unresolved markers, banned claims and invented external links", () => {
    expect(messages(input({ markdown: `${linked}\n\nMore detail here. [[NEEDS_SOURCE]]` })).some((m) => /NEEDS_SOURCE/.test(m))).toBe(true);
    const banned = linked.replace("Launch in phases.", "Our clients see +312% growth.[^r4]");
    expect(messages(input({ markdown: banned })).some((m) => /Banned claim found \(\+312%/.test(m))).toBe(true);
    const external = linked.replace("Launch in phases.", "See [this report](https://random.example/report).");
    expect(messages(input({ markdown: external }))).toContain("External link https://random.example/report is not one of the saved research sources");
  });

  it("checks headings, length and internal links", () => {
    expect(messages(input({ markdown: linked.replace("## How to keep costs under control", "#### How to keep costs under control") }))).toContain(
      'Heading "How to keep costs under control" skips a level (H2 → H4)',
    );
    expect(messages(input({ wordCountTarget: 2000 })).some((m) => /Word count 742 is outside 1700–2500/.test(m))).toBe(true);
    const ghost = linked.replace("(/contact-us)", "(/old-contact)");
    expect(messages(input({ markdown: ghost }))).toContain("Internal link /old-contact is not a published page");
  });

  it("requires the FAQ schema to match the visible FAQ word for word", () => {
    const faq = [{ ...fx.s7.faq[0], answer: "A different answer." }, fx.s7.faq[1]];
    expect(messages(input({ faq })).some((m) => /FAQ answer for "How much is a basic website in Nigeria\?" differs/.test(m))).toBe(true);
    const missing = [{ question: "Is hosting included?", answer: "Sometimes." }, fx.s7.faq[1]];
    expect(messages(input({ faq: missing })).some((m) => /not an H3/.test(m))).toBe(true);
  });

  it("catches a citation that links the wrong source", () => {
    const wrong = linked.replace("(https://example.org/hosting-plans)", "(https://example.org/elsewhere)");
    const m = messages(input({ markdown: wrong }));
    expect(m).toContain("Footnote [^r2] must link to https://example.org/hosting-plans");
  });
});

describe("buildChunks", () => {
  it("splits markdown into full, intro, sections, FAQ and meta, without footnotes", () => {
    const chunks = buildChunks({ title: fx.s6.title, content: linked, format: "markdown", metaTitle: fx.s7.meta_title, metaDescription: fx.s7.meta_description, faq: fx.s7.faq });
    expect(chunks.map((c) => `${c.scope}:${c.section_key}`)).toEqual([
      "full:", "intro:", "section:what-drives-website-cost-in-nigeria", "section:typical-price-ranges-by-website-type",
      "section:ongoing-costs-after-launch", "section:how-to-keep-costs-under-control", "faq:", "meta:",
    ]);
    expect(chunks.every((c) => !c.body.includes("Example Registry"))).toBe(true);
    expect(new Set(chunks.map((c) => c.content_hash)).size).toBe(chunks.length);
  });

  it("handles legacy HTML posts the same way", () => {
    const chunks = buildChunks({ title: "T", content: "<p>Intro text.</p><h2>One</h2><p>a</p><h2>One</h2><p>b</p>", format: "html" });
    expect(chunks.map((c) => `${c.scope}:${c.section_key}`)).toEqual(["full:", "intro:", "section:one", "section:one-2"]);
  });
});
