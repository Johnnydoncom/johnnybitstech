import { describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";

describe("brand context", () => {
  const brand = getBrandContext();

  it("validates against its schema", () => {
    expect(brand.company.siteUrl).toBe("https://johnnybits.com");
    expect(brand.authors[0]).toMatchObject({
      name: "Odoh John",
      jobTitle: "Software Developer",
      sameAs: ["https://ng.linkedin.com/in/johnnybits"],
    });
    expect(brand.defaultAuthorSlug).toBe("odoh-john");
  });

  it("has no approved claims until the owner verifies them", () => {
    expect(brand.approvedClaims).toEqual([]);
  });

  it("bans every contradictory or unverified marketing figure found on the site", () => {
    const banned = brand.bannedClaims.map((b) => b.pattern).join(" ");
    for (const figure of ["10+ years", "150+", "+312%", "45%", "5.0★", "97%"]) expect(banned).toContain(figure);
  });

  it("only lists portfolio projects with real URLs", () => {
    expect(brand.portfolio.length).toBeGreaterThan(0);
    expect(brand.portfolio.every((p) => p.url.startsWith("https://"))).toBe(true);
  });

  it("uses the same canonical service URLs as the link targets", () => {
    const targets = new Set(linkTargetSeeds().filter((t) => t.type === "service").map((t) => t.url));
    expect(new Set(brand.services.map((s) => s.url))).toEqual(targets);
    for (const cta of brand.ctas) if (cta.url.startsWith("/")) expect(linkTargetSeeds().map((t) => t.url)).toContain(cta.url);
  });
});
