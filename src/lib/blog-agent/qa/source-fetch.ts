import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { htmlToText } from "./originality";

/**
 * Fetches a research source's visible text for the originality check. The URLs come from the agent, so every hop
 * is guarded against server-side request forgery: https on port 443 only, no IP literals or internal host names,
 * every resolved address must be public, redirects are followed manually (max 3) and re-checked, and the body is
 * capped in size and time. Only HTML and plain text are read; anything else (PDF, images) is reported as not checked.
 */

export const SOURCE_TIMEOUT_MS = 5_000;
export const SOURCE_MAX_BYTES = 2_000_000;
export const SOURCE_MAX_REDIRECTS = 3;

export type SourceFetchResult =
  | { ok: true; url: string; text: string }
  | { ok: false; url: string; reason: string };

export type SourceFetcher = (url: string) => Promise<SourceFetchResult>;

export type LookupFn = (hostname: string) => Promise<{ address: string; family: number }[]>;

const defaultLookup: LookupFn = (hostname) => dnsLookup(hostname, { all: true, verbatim: true });

function ipv4Private(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 || // this-network, private, loopback, multicast/reserved
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol assignments, TEST-NET-1
    (a === 198 && (b === 18 || b === 19)) // benchmarking
  );
}

/** True for loopback, private, link-local, unique-local, multicast and other non-public addresses. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (isIP(ip) === 4) return ipv4Private(ip);
  if (isIP(ip) !== 6) return true;
  if (ip === "::" || ip === "::1") return true;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Private(mapped[1]);
  if (/^::ffff:/.test(ip) || /^64:ff9b:/.test(ip)) return true; // other mapped / NAT64 forms: refuse
  const first = parseInt(ip.split(":")[0] || "0", 16);
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00; // ULA, link-local, multicast
}

/** Reason the URL may not be fetched, or null when it may. Does not resolve DNS. */
export function unsafeUrlReason(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "not a valid URL";
  }
  if (url.protocol !== "https:") return "only https sources are checked";
  if (url.username || url.password) return "URLs with credentials are not fetched";
  if (url.port && url.port !== "443") return "only the standard https port is allowed";
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(host.replace(/^\[|\]$/g, ""))) return "IP-address URLs are not fetched";
  if (!host.includes(".")) return "single-label host names are not fetched";
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|home\.arpa)$/.test(host)) return "internal host names are not fetched";
  return null;
}

async function assertPublicHost(hostname: string, lookup: LookupFn): Promise<string | null> {
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname);
  } catch {
    return "the host name does not resolve";
  }
  if (!addresses.length) return "the host name does not resolve";
  if (addresses.some((a) => isPrivateAddress(a.address))) return "the host resolves to a private address";
  return null;
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const buf = new Uint8Array(Math.min(size, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    const take = Math.min(c.byteLength, buf.length - offset);
    buf.set(c.subarray(0, take), offset);
    offset += take;
    if (offset >= buf.length) break;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

export type FetchSourceOptions = {
  fetchImpl?: typeof fetch;
  lookup?: LookupFn;
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
};

export function createSourceFetcher(options: FetchSourceOptions = {}): SourceFetcher {
  const fetchImpl = options.fetchImpl ?? fetch;
  const lookup = options.lookup ?? defaultLookup;
  const timeoutMs = options.timeoutMs ?? SOURCE_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? SOURCE_MAX_BYTES;
  const userAgent = options.userAgent ?? "JohnnybitsOriginalityCheck/1.0 (+https://johnnybits.com)";

  return async (start) => {
    let current = start;
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      for (let hop = 0; hop <= SOURCE_MAX_REDIRECTS; hop++) {
        const unsafe = unsafeUrlReason(current);
        if (unsafe) return { ok: false, url: start, reason: unsafe };
        const privateHost = await assertPublicHost(new URL(current).hostname.replace(/^\[|\]$/g, ""), lookup);
        if (privateHost) return { ok: false, url: start, reason: privateHost };

        const res = await fetchImpl(current, {
          redirect: "manual",
          signal,
          headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml,text/plain;q=0.8" },
        });
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          await res.body?.cancel().catch(() => undefined);
          if (!location) return { ok: false, url: start, reason: `redirect (${res.status}) without a location` };
          current = new URL(location, current).toString();
          continue;
        }
        if (!res.ok) {
          await res.body?.cancel().catch(() => undefined);
          return { ok: false, url: start, reason: `the page returned HTTP ${res.status}` };
        }
        const type = (res.headers.get("content-type") ?? "").toLowerCase();
        const isHtml = type.includes("text/html") || type.includes("application/xhtml");
        if (!isHtml && !type.startsWith("text/plain")) {
          await res.body?.cancel().catch(() => undefined);
          return { ok: false, url: start, reason: `not an HTML page (${type.split(";")[0] || "unknown type"})` };
        }
        const body = await readCapped(res, maxBytes);
        const text = isHtml ? htmlToText(body) : body;
        if (text.split(/\s+/).length < 30) return { ok: false, url: start, reason: "the page has too little readable text (it may need JavaScript or block automated readers)" };
        return { ok: true, url: start, text };
      }
      return { ok: false, url: start, reason: `more than ${SOURCE_MAX_REDIRECTS} redirects` };
    } catch (error) {
      const name = (error as { name?: string }).name;
      return { ok: false, url: start, reason: name === "TimeoutError" || name === "AbortError" ? "the page took too long to respond" : "the page could not be fetched" };
    }
  };
}

export const fetchSourceText: SourceFetcher = createSourceFetcher();
