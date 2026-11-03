import { parseMarkdown, textOf, walk, type MdNode } from "../markdown";

export type LinkPick = { url: string; anchor_text: string; sentence: string; reason?: string };
export type TargetType = "article" | "service" | "portfolio" | "contact" | "category" | "pillar" | "page";
export type Issue = { path: string; message: string };

/** Internal links per article: at least 3, roughly one per 250 words, never more than 10. */
export function linkCountRange(wordCount: number) {
  return { min: 3, max: Math.min(10, Math.max(3, Math.ceil(wordCount / 250))) };
}

/** Link targets that count as a commercial/next-step link (an article must have at least one). */
export const CONVERSION_TYPES: ReadonlySet<TargetType> = new Set(["service", "contact", "portfolio"]);

/** Node types a link must never be placed inside. */
const FORBIDDEN_ANCESTORS = new Set(["heading", "link", "linkReference", "footnoteDefinition", "inlineCode", "code", "html", "image"]);

export function isInternalUrl(url: string, siteOrigin: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    return new URL(url).origin === new URL(siteOrigin).origin;
  } catch {
    return false;
  }
}

/** Internal links already present in the body (outside footnote definitions). */
export function existingInternalLinks(markdown: string, siteOrigin: string): string[] {
  const urls: string[] = [];
  walk(parseMarkdown(markdown), (n, anc) => {
    if (n.type === "link" && n.url && !anc.some((a) => a.type === "footnoteDefinition") && isInternalUrl(n.url, siteOrigin)) urls.push(n.url);
  });
  return urls;
}

function occurrences(haystack: string, needle: string): number[] {
  const at: number[] = [];
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) at.push(i);
  return at;
}

/** The text node whose source range fully contains [start, end), with its ancestors. */
function textNodeAt(tree: MdNode, start: number, end: number): { node: MdNode; ancestors: MdNode[] } | null {
  let found: { node: MdNode; ancestors: MdNode[] } | null = null;
  walk(tree, (n, ancestors) => {
    const s = n.position?.start.offset;
    const e = n.position?.end.offset;
    if (n.type === "text" && s !== undefined && e !== undefined && s <= start && e >= end) found = { node: n, ancestors };
  });
  return found;
}

export type InsertResult =
  | { ok: true; markdown: string; applied: { url: string; anchor_text: string; offset: number }[] }
  | { ok: false; errors: Issue[] };

/**
 * Deterministically inserts internal links chosen by the agent. Every rule is checked before any change,
 * then the result is re-parsed and verified (each link present exactly once, and removing the links
 * restores the original text byte-for-byte).
 */
export function insertLinks(
  markdown: string,
  links: readonly LinkPick[],
  targets: ReadonlyMap<string, TargetType>,
  options: { wordCount: number; siteOrigin: string },
): InsertResult {
  const errors: Issue[] = [];
  const existing = existingInternalLinks(markdown, options.siteOrigin);
  const { min, max } = linkCountRange(options.wordCount);
  const total = existing.length + links.length;
  if (total < min || total > max) {
    errors.push({
      path: "links",
      message: `An article of ${options.wordCount} words needs ${min}–${max} internal links in total; this would give ${total}${existing.length ? ` (${existing.length} already in the draft)` : ""}`,
    });
  }
  if (!links.some((l) => CONVERSION_TYPES.has(targets.get(l.url) ?? "article")) && !existing.some((u) => CONVERSION_TYPES.has(targets.get(u) ?? "article"))) {
    errors.push({ path: "links", message: "Include at least one link to a service, portfolio or contact page" });
  }

  const tree = parseMarkdown(markdown);
  const seenUrls = new Set(existing);
  const seenAnchors = new Set<string>();
  const spans: { start: number; end: number; link: LinkPick; index: number }[] = [];

  links.forEach((link, i) => {
    const path = `links.${i}`;
    const before = errors.length;
    if (!targets.has(link.url)) errors.push({ path: `${path}.url`, message: `${link.url} is not a published page returned by find_link_candidates` });
    if (seenUrls.has(link.url)) errors.push({ path: `${path}.url`, message: `${link.url} is linked more than once` });
    seenUrls.add(link.url);
    const anchorKey = link.anchor_text.trim().toLowerCase();
    if (seenAnchors.has(anchorKey)) errors.push({ path: `${path}.anchor_text`, message: "Anchor text is repeated; vary the anchors" });
    seenAnchors.add(anchorKey);
    if (/[[\]()]/.test(link.anchor_text)) errors.push({ path: `${path}.anchor_text`, message: "Anchor text cannot contain brackets or parentheses" });

    const sentenceAt = occurrences(markdown, link.sentence);
    if (sentenceAt.length !== 1) {
      errors.push({ path: `${path}.sentence`, message: sentenceAt.length ? "Sentence appears more than once in the draft; pick a unique sentence" : "Sentence is not in the latest draft verbatim" });
      return;
    }
    const anchorAt = occurrences(link.sentence, link.anchor_text);
    if (anchorAt.length === 0) {
      errors.push({ path: `${path}.anchor_text`, message: "Anchor text must appear verbatim in the sentence" });
      return;
    }
    if (errors.length > before) return;

    const start = sentenceAt[0] + anchorAt[0];
    const end = start + link.anchor_text.length;
    const hit = textNodeAt(tree, start, end);
    if (!hit || markdown.slice(start, end) !== link.anchor_text) {
      errors.push({ path: `${path}.anchor_text`, message: "Anchor text must be plain text (not split across formatting such as bold or a footnote)" });
      return;
    }
    const blocked = hit.ancestors.find((a) => FORBIDDEN_ANCESTORS.has(a.type));
    if (blocked) {
      errors.push({ path: `${path}.anchor_text`, message: blocked.type === "heading" ? "Links cannot go in headings" : `Links cannot go inside ${blocked.type}` });
      return;
    }
    spans.push({ start, end, link, index: i });
  });

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) errors.push({ path: `links.${sorted[i].index}.anchor_text`, message: "Overlaps another link's anchor" });
  }
  if (errors.length) return { ok: false, errors };

  let result = markdown;
  for (const span of [...sorted].reverse()) {
    result = `${result.slice(0, span.start)}[${span.link.anchor_text}](${span.link.url})${result.slice(span.end)}`;
  }

  // Verify: each inserted link exists exactly once as a real link node with the exact anchor text.
  const linkNodes: { url: string; text: string }[] = [];
  walk(parseMarkdown(result), (n) => n.type === "link" && n.url && linkNodes.push({ url: n.url, text: textOf(n) }));
  for (const span of sorted) {
    const matches = linkNodes.filter((l) => l.url === span.link.url && l.text === span.link.anchor_text).length;
    if (matches !== 1) errors.push({ path: `links.${span.index}`, message: "Link could not be inserted cleanly" });
  }
  let restored = result;
  for (const span of sorted) restored = restored.replace(`[${span.link.anchor_text}](${span.link.url})`, span.link.anchor_text);
  if (restored !== markdown) errors.push({ path: "links", message: "Link insertion changed other text; nothing was applied" });
  if (errors.length) return { ok: false, errors };

  return { ok: true, markdown: result, applied: sorted.map((s) => ({ url: s.link.url, anchor_text: s.link.anchor_text, offset: s.start })) };
}
