import { describe, expect, it } from "vitest";
import { contentStats, countWords, htmlToText, markdownToText, readingMinutes } from "@/lib/blog/text";
import { legacyHtml } from "../helpers/db";

describe("text extraction", () => {
  it("strips tags, scripts and entities from HTML", () => {
    expect(htmlToText("<p>Hello&nbsp;<b>Lagos</b></p><script>alert(1)</script><p>&#8358;5,000 &amp; more</p>")).toBe("Hello Lagos ₦5,000 & more");
  });

  it("does not merge words across block elements", () => {
    expect(htmlToText("<h2>Intro</h2><p>Body</p>")).toBe("Intro Body");
    expect(markdownToText("# Title\n\nFirst para.\n\n- item one\n- item two")).toBe("Title First para. item one item two");
  });

  it("ignores markdown syntax and image alt text when counting", () => {
    const md = "## Heading\n\nA [link text](https://example.com) and `code`.\n\n![alt words here](/x.png)\n\n| a | b |\n|---|---|\n| c | d |";
    expect(countWords(markdownToText(md))).toBe(10);
  });

  it("counts only tokens with letters or digits", () => {
    expect(countWords("Paystack — Flutterwave · 2026 !!")).toBe(3);
  });
});

describe("reading time (regression: every post showed '1 min')", () => {
  it("reflects real length of legacy HTML posts", () => {
    expect(contentStats(legacyHtml(1125), "html")).toMatchObject({ readingMinutes: 5 });
    expect(contentStats(legacyHtml(2250), "html").readingMinutes).toBe(10);
  });

  it("never returns less than one minute", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(100)).toBe(1);
  });

  it("does not count HTML tags as words", () => {
    const html = '<p class="a" style="b">one two</p><img src="/x.png" alt="three" />';
    expect(contentStats(html, "html").wordCount).toBe(2);
  });
});
