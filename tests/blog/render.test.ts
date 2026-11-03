import { describe, expect, it } from "vitest";
import { renderArticleHtml } from "@/lib/blog/render";

describe("renderArticleHtml (legacy HTML)", () => {
  it("removes scripts, event handlers and javascript: URLs", () => {
    const html = renderArticleHtml(
      '<p onclick="x()">Hi</p><script>alert(1)</script><img src="/a.png" onerror="x()"><a href="javascript:alert(1)">bad</a>',
      "html",
    );
    expect(html).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(html).toContain("<p>Hi</p>");
  });

  it("keeps legacy inline image styles and Quill classes so existing posts look the same", () => {
    const html = renderArticleHtml(
      '<img src="/assets/blog/x.png" alt="x" style="border-radius: 12px; margin: 24px 0; width: 100%;"><p class="ql-align-center">c</p>',
      "html",
    );
    expect(html).toContain('style="border-radius: 12px; margin: 24px 0; width: 100%;"');
    expect(html).toContain('class="ql-align-center"');
    expect(html).toContain('loading="lazy"');
  });

  it("adds ids to headings for deep links", () => {
    expect(renderArticleHtml("<h2>Paystack vs Flutterwave</h2>", "html")).toContain('<h2 id="paystack-vs-flutterwave">');
  });

  it("marks external links only", () => {
    const html = renderArticleHtml('<a href="https://paystack.com/pricing">p</a><a href="/contact-us">c</a><a href="https://johnnybits.com/blog">b</a>', "html");
    expect(html).toContain('<a href="https://paystack.com/pricing" rel="noopener noreferrer" target="_blank">');
    expect(html).toContain('<a href="/contact-us">');
    expect(html).toContain('<a href="https://johnnybits.com/blog">');
  });
});

describe("renderArticleHtml (agent markdown)", () => {
  it("renders GFM tables", () => {
    const html = renderArticleHtml("| Gateway | Fee |\n|---|---|\n| Paystack | 1.5% |", "markdown");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>Paystack</td>");
  });

  it("renders footnote citations whose links resolve to their targets", () => {
    const html = renderArticleHtml("Fees are 1.5%.[^1]\n\n[^1]: [Paystack pricing](https://paystack.com/pricing), 2026.", "markdown");
    const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    expect(hrefs.length).toBeGreaterThanOrEqual(2);
    for (const href of hrefs) expect(ids.has(href), `#${href} has a target`).toBe(true);
    expect(html).toContain("data-footnotes");
  });

  it("drops raw HTML embedded in markdown", () => {
    const html = renderArticleHtml("Hello <script>alert(1)</script> <iframe src='https://x'></iframe>", "markdown");
    expect(html).not.toMatch(/<script|<iframe/i);
  });
});
