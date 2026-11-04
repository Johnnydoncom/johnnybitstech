import { describe, expect, it } from "vitest";
import {
  containment,
  htmlToText,
  markdownToText,
  prepare,
  sharedPassages,
  shingles,
  tokenize,
  unquotedShingles,
} from "@/lib/blog-agent/qa/originality";
import { createSourceFetcher, isPrivateAddress, unsafeUrlReason, type LookupFn } from "@/lib/blog-agent/qa/source-fetch";

const SOURCE =
  "Scope is the biggest driver. A small brochure site with a handful of pages needs far less design and testing than a platform " +
  "with customer accounts, search and integrations. Pricing also varies by city and by the experience of the team you hire.";

describe("originality text comparison", () => {
  it("finds a copied run of 12+ words regardless of punctuation and case", () => {
    const draft = tokenize("Intro text here. A SMALL brochure site, with a handful of pages, needs far less design and testing than most people expect.");
    const passages = sharedPassages(draft, tokenize(SOURCE).map((t) => t.word));
    expect(passages).toHaveLength(1);
    expect(passages[0].words).toBeGreaterThanOrEqual(12);
    expect(passages[0].excerpt).toContain("a small brochure site with a handful of pages needs far less design and testing than");
  });

  it("allows the same words when they are quoted or in a blockquote", () => {
    const quoted = tokenize('As one guide puts it, "a small brochure site with a handful of pages needs far less design and testing than a platform".');
    expect(sharedPassages(quoted, tokenize(SOURCE).map((t) => t.word))).toEqual([]);
    const curly = tokenize("It says “a small brochure site with a handful of pages needs far less design and testing than a platform”.");
    expect(sharedPassages(curly, tokenize(SOURCE).map((t) => t.word))).toEqual([]);
    const block = tokenize("> A small brochure site with a handful of pages needs far less design and testing than a platform.");
    expect(sharedPassages(block, tokenize(SOURCE).map((t) => t.word))).toEqual([]);
  });

  it("ignores short shared phrases", () => {
    const draft = tokenize("Every business wants a small brochure site with a handful of pages at first, then grows.");
    expect(sharedPassages(draft, tokenize(SOURCE).map((t) => t.word))).toEqual([]);
  });

  it("measures overlap as the share of the draft's 8-word phrases found elsewhere", () => {
    const a = prepare("one two three four five six seven eight nine ten");
    expect(a.shingles.size).toBe(3);
    expect(containment(a.shingles, shingles("zero one two three four five six seven eight nine".split(" ")))).toBeCloseTo(2 / 3);
    expect(containment(a.shingles, new Set())).toBe(0);
    expect(unquotedShingles(tokenize('one two three four "five" six seven eight nine ten')).size).toBe(0);
  });

  it("strips markdown syntax, URLs and footnote definitions before comparing", () => {
    const text = markdownToText("## Heading\n\nSee [our pricing](/pricing) and ![alt](https://x.test/a.png) at https://x.test.[^r1]\n\n[^r1]: Example Registry, https://example.org");
    expect(text).toContain("Heading");
    expect(text).toContain("our pricing");
    expect(text).not.toMatch(/https?:|\[\^r1\]|Example Registry|alt/);
  });

  it("reads only the visible text of an HTML page and keeps blockquotes as quotes", () => {
    const text = htmlToText("<html><head><title>T</title><style>p{}</style></head><body><nav>Menu</nav><p>Hello &amp; welcome</p><script>var x</script><blockquote>Quoted line</blockquote></body></html>");
    expect(text).toContain("Hello & welcome");
    expect(text).toContain("“Quoted line”");
    expect(text).not.toMatch(/Menu|var x|p\{\}/);
  });
});

describe("source fetcher SSRF guard", () => {
  it("rejects unsafe URLs before any network access", () => {
    expect(unsafeUrlReason("http://example.org/a")).toMatch(/https/);
    expect(unsafeUrlReason("https://127.0.0.1/a")).toMatch(/IP-address/);
    expect(unsafeUrlReason("https://[::1]/a")).toMatch(/IP-address/);
    expect(unsafeUrlReason("https://localhost/a")).toMatch(/single-label/);
    expect(unsafeUrlReason("https://db.internal/a")).toMatch(/internal/);
    expect(unsafeUrlReason("https://example.org:8443/a")).toMatch(/port/);
    expect(unsafeUrlReason("https://user:pw@example.org/a")).toMatch(/credentials/);
    expect(unsafeUrlReason("https://www.example.org/a")).toBeNull();
  });

  it("knows private and public addresses", () => {
    for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "192.0.78.9", "2606:4700::1111", "::ffff:8.8.8.8"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  const publicLookup: LookupFn = async () => [{ address: "93.184.216.34", family: 4 }];
  const page = (body: string, init: ResponseInit = {}) => new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, ...init });
  const LONG = `<p>${"Plenty of readable words on this public page. ".repeat(10)}</p>`;

  it("refuses hosts that resolve to private addresses (DNS rebinding)", async () => {
    let fetched = false;
    const fetcher = createSourceFetcher({ lookup: async () => [{ address: "10.0.0.5", family: 4 }], fetchImpl: (async () => ((fetched = true), page(LONG))) as unknown as typeof fetch });
    expect(await fetcher("https://evil.example/a")).toMatchObject({ ok: false, reason: expect.stringMatching(/private address/) });
    expect(fetched).toBe(false);
  });

  it("re-checks every redirect hop and stops at unsafe ones", async () => {
    const hops: string[] = [];
    const fetchImpl = (async (url: string) => {
      hops.push(url);
      if (url.endsWith("/start")) return new Response(null, { status: 302, headers: { location: "https://cdn.example.org/next" } });
      if (url.endsWith("/next")) return new Response(null, { status: 301, headers: { location: "http://169.254.169.254/latest/meta-data" } });
      return page(LONG);
    }) as unknown as typeof fetch;
    const fetcher = createSourceFetcher({ lookup: publicLookup, fetchImpl });
    expect(await fetcher("https://example.org/start")).toMatchObject({ ok: false, reason: expect.stringMatching(/https/) });
    expect(hops).toEqual(["https://example.org/start", "https://cdn.example.org/next"]);
  });

  it("gives up after too many redirects", async () => {
    const fetchImpl = (async (url: string) => new Response(null, { status: 302, headers: { location: `${url}x` } })) as unknown as typeof fetch;
    expect(await createSourceFetcher({ lookup: publicLookup, fetchImpl })("https://example.org/r")).toMatchObject({ ok: false, reason: expect.stringMatching(/redirects/) });
  });

  it("reads HTML and plain text only, capped in size", async () => {
    const pdf = (async () => new Response("%PDF", { status: 200, headers: { "content-type": "application/pdf" } })) as unknown as typeof fetch;
    expect(await createSourceFetcher({ lookup: publicLookup, fetchImpl: pdf })("https://example.org/a.pdf")).toMatchObject({ ok: false, reason: expect.stringMatching(/not an HTML page/) });

    const big = (async () => page(`<p>${"word ".repeat(50_000)}</p>`)) as unknown as typeof fetch;
    const result = await createSourceFetcher({ lookup: publicLookup, fetchImpl: big, maxBytes: 1_000 })("https://example.org/big");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text.length).toBeLessThanOrEqual(1_000);

    const ok = (async (_url: string, init: RequestInit) => {
      expect(init.redirect).toBe("manual");
      return page(LONG);
    }) as unknown as typeof fetch;
    expect(await createSourceFetcher({ lookup: publicLookup, fetchImpl: ok })("https://example.org/ok")).toMatchObject({ ok: true, text: expect.stringContaining("readable words") });
  });

  it("reports HTTP errors, unresolvable hosts and timeouts without throwing", async () => {
    const notFound = (async () => new Response("nope", { status: 404 })) as unknown as typeof fetch;
    expect(await createSourceFetcher({ lookup: publicLookup, fetchImpl: notFound })("https://example.org/x")).toMatchObject({ ok: false, reason: "the page returned HTTP 404" });
    const noDns: LookupFn = async () => {
      throw new Error("ENOTFOUND");
    };
    expect(await createSourceFetcher({ lookup: noDns })("https://nowhere.example/x")).toMatchObject({ ok: false, reason: "the host name does not resolve" });
    const slow = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(Object.assign(new Error("t"), { name: "TimeoutError" }))))) as unknown as typeof fetch;
    expect(await createSourceFetcher({ lookup: publicLookup, fetchImpl: slow, timeoutMs: 50 })("https://example.org/slow")).toMatchObject({ ok: false, reason: expect.stringMatching(/too long/) });
  });
});
