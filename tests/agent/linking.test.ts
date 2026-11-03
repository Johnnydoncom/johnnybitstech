import { describe, expect, it } from "vitest";
import { insertLinks, linkCountRange, type TargetType } from "@/lib/blog-agent/linking/insert";
import * as fx from "../fixtures/stages";

const targets = new Map<string, TargetType>([
  ["/ecommerce-web-development", "service"],
  ["/website-maintenance-and-support", "service"],
  ["/contact-us", "contact"],
  ["/blog/seo-in-nigeria-local-ranking-2026", "article"],
]);
const opts = { wordCount: 742, siteOrigin: "https://johnnybits.com" };
const md = fx.s6.markdown;

function errorsOf(result: ReturnType<typeof insertLinks>) {
  return result.ok ? [] : result.errors.map((e) => e.message);
}

describe("linkCountRange", () => {
  it("scales with length between 3 and 10", () => {
    expect(linkCountRange(300)).toEqual({ min: 3, max: 3 });
    expect(linkCountRange(1600)).toEqual({ min: 3, max: 7 });
    expect(linkCountRange(5000)).toEqual({ min: 3, max: 10 });
  });
});

describe("insertLinks", () => {
  it("inserts every link exactly once and changes nothing else", () => {
    const result = insertLinks(md, fx.s8.links, targets, opts);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("an [ecommerce website](/ecommerce-web-development) needs");
    expect(result.markdown).toContain("A [website maintenance plan](/website-maintenance-and-support) covers");
    expect(result.markdown).toContain("ask for an [itemised quote](/contact-us) that");
    let restored = result.markdown;
    for (const l of fx.s8.links) restored = restored.replace(`[${l.anchor_text}](${l.url})`, l.anchor_text);
    expect(restored).toBe(md);
    expect(result.applied.map((a) => a.url)).toEqual(["/ecommerce-web-development", "/website-maintenance-and-support", "/contact-us"]);
  });

  it("enforces the link-count range", () => {
    expect(errorsOf(insertLinks(md, fx.s8.links.slice(0, 2), targets, opts))[0]).toMatch(/needs 3–3 internal links/);
  });

  it("requires at least one service, portfolio or contact link", () => {
    const articleOnly = new Map<string, TargetType>([...targets].map(([u]) => [u, "article"]));
    expect(errorsOf(insertLinks(md, fx.s8.links, articleOnly, opts))).toContain("Include at least one link to a service, portfolio or contact page");
  });

  it("rejects unknown URLs, repeated URLs and repeated anchors", () => {
    const links = [fx.s8.links[0], { ...fx.s8.links[1], url: "/ecommerce-web-development" }, { ...fx.s8.links[2], url: "/nowhere" }];
    const errors = errorsOf(insertLinks(md, links, targets, opts));
    expect(errors.some((e) => /linked more than once/.test(e))).toBe(true);
    expect(errors.some((e) => /\/nowhere is not a published page/.test(e))).toBe(true);
    const repeatedAnchor = [fx.s8.links[0], { ...fx.s8.links[1], anchor_text: "Ecommerce Website" }, fx.s8.links[2]];
    expect(errorsOf(insertLinks(md, repeatedAnchor, targets, opts)).some((e) => /Anchor text must appear|repeated/.test(e))).toBe(true);
  });

  it("refuses headings, footnotes, existing links and anchors split by formatting", () => {
    const heading = { url: "/contact-us", anchor_text: "Ongoing costs", sentence: "## Ongoing costs after launch", reason: "x" };
    expect(errorsOf(insertLinks(md, [fx.s8.links[0], fx.s8.links[1], heading], targets, opts))).toContain("Links cannot go in headings");

    const footnote = { url: "/contact-us", anchor_text: "domain pricing", sentence: "[Example Registry — domain pricing](https://example.org/nira-domains), 2026.", reason: "x" };
    expect(errorsOf(insertLinks(md, [fx.s8.links[0], fx.s8.links[1], footnote], targets, opts)).some((e) => /cannot go inside (link|footnoteDefinition)/.test(e))).toBe(true);

    const bolded = md.replace("an ecommerce website needs", "an **ecommerce** website needs");
    const sentence = "If you plan to sell online, an **ecommerce** website needs product management, checkout and payment integration.";
    // Verbatim in the source, but it straddles the bold markup, so it is not plain text.
    const split = { ...fx.s8.links[0], sentence, anchor_text: "**ecommerce** website" };
    expect(errorsOf(insertLinks(bolded, [split, fx.s8.links[1], fx.s8.links[2]], targets, opts)).some((e) => /plain text/.test(e))).toBe(true);
  });

  it("refuses a sentence that is missing or appears twice", () => {
    const twice = `${md}\n\nA website maintenance plan covers updates, backups and security monitoring after launch.`;
    expect(errorsOf(insertLinks(twice, fx.s8.links, targets, opts)).some((e) => /more than once/.test(e))).toBe(true);
    const missing = [{ ...fx.s8.links[0], sentence: "Not in the draft." }, fx.s8.links[1], fx.s8.links[2]];
    expect(errorsOf(insertLinks(md, missing, targets, opts)).some((e) => /not in the latest draft/.test(e))).toBe(true);
  });

  it("counts links already in the draft toward the range", () => {
    const withLink = md.replace("Launch in phases.", "Launch in phases, as our [SEO guide](/blog/seo-in-nigeria-local-ranking-2026) explains.");
    expect(errorsOf(insertLinks(withLink, fx.s8.links, targets, opts))[0]).toMatch(/would give 4 \(1 already in the draft\)/);
  });
});
