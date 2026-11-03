import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { ContentFormat } from "@/db/schema";

/** Words per minute used for read-time estimates (typical adult reading speed for web copy). */
export const WORDS_PER_MINUTE = 225;

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|tr|td|th|blockquote|pre)>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

type MdNode = { type: string; value?: string; children?: MdNode[] };

/** Collects text leaves with spaces between them, so table cells and list items never merge. Skips images. */
function collectText(node: MdNode, out: string[]) {
  if (node.type === "image" || node.type === "imageReference" || node.type === "html") return;
  if (typeof node.value === "string") out.push(node.value);
  for (const child of node.children ?? []) collectText(child, out);
}

export function markdownToText(markdown: string): string {
  const out: string[] = [];
  collectText(unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdNode, out);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

export function contentToText(content: string, format: ContentFormat): string {
  return format === "html" ? htmlToText(content) : markdownToText(content);
}

/** Counts tokens that contain at least one letter or digit (ignores stray punctuation such as "—"). */
export function countWords(text: string): number {
  return text.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function readingMinutes(wordCount: number, wpm = WORDS_PER_MINUTE): number {
  return Math.max(1, Math.round(wordCount / wpm));
}

export function contentStats(content: string, format: ContentFormat) {
  const wordCount = countWords(contentToText(content, format));
  return { wordCount, readingMinutes: readingMinutes(wordCount) };
}
