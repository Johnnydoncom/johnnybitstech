/**
 * Free, deterministic originality checks (no paid plagiarism API):
 *  - overlap with the site's own articles (n-gram containment), so posts written for the same keyword stay distinct;
 *  - copied passages from the research sources the article cites (long runs of identical words outside quotation marks).
 *
 * Text is compared as lower-cased word sequences, so formatting, punctuation and markdown syntax do not matter.
 */

/** Words in a row that count as a copied passage. */
export const COPIED_RUN_WORDS = 12;
/** n-gram size for overlap ("containment") between two texts. */
export const SHINGLE_WORDS = 8;
/** Share of the draft's 8-word sequences found in another article. */
export const INTERNAL_OVERLAP_ERROR = 0.15;
export const INTERNAL_OVERLAP_WARNING = 0.05;
/** Share of the draft's 8-word sequences found in one source (stitched-together close paraphrase). */
export const SOURCE_OVERLAP_ERROR = 0.1;

export type Token = { word: string; quoted: boolean };
export type Passage = { words: number; excerpt: string };

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu;
const QUOTED = /"[^"\n]{1,800}"|“[^”\n]{1,800}”/g;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Visible text of an HTML document or fragment, one line per block element. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template|svg|head|nav|footer|form)\b[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote\s*>/gi, (_m, inner: string) => `\n“${inner.replace(/[“”]/g, "")}”\n`)
      .replace(/<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|section|article|header|main|aside|figure|figcaption)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Article markdown as plain prose lines: no code, URLs, image/link syntax, footnote markers or footnote definitions. */
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/^\s*\[\^[^\]]+\]:.*$/gm, " ") // footnote definitions are citations, not prose
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\^[^\]]+\]/g, " ")
    .replace(/<[^>\n]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/[*_~|]+/g, " ");
}

/**
 * Splits prose into words, marking those inside quotation marks or blockquote lines: quoting a source with
 * attribution is allowed, copying it unquoted is not.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const push = (segment: string, quoted: boolean) => {
    for (const m of segment.toLowerCase().replace(/’/g, "'").matchAll(WORD)) tokens.push({ word: m[0], quoted });
  };
  for (const line of text.split("\n")) {
    if (/^\s*>/.test(line)) {
      push(line, true);
      continue;
    }
    let last = 0;
    for (const m of line.matchAll(QUOTED)) {
      push(line.slice(last, m.index), false);
      push(m[0], true);
      last = m.index! + m[0].length;
    }
    push(line.slice(last), false);
  }
  return tokens;
}

export function shingles(words: readonly string[], n = SHINGLE_WORDS): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(" "));
  return set;
}

/** Share of `draft`'s n-grams that also occur in `other` (0–1). */
export function containment(draft: ReadonlySet<string>, other: ReadonlySet<string>): number {
  if (!draft.size || !other.size) return 0;
  let shared = 0;
  for (const s of draft) if (other.has(s)) shared++;
  return shared / draft.size;
}

/**
 * Runs of at least `minWords` consecutive draft words (none of them quoted) that also appear, in the same order,
 * in the other text. Overlapping matches are merged into one passage. Longest first.
 */
export function sharedPassages(draft: readonly Token[], otherWords: readonly string[], minWords = COPIED_RUN_WORDS): Passage[] {
  if (draft.length < minWords || otherWords.length < minWords) return [];
  const other = shingles(otherWords, minWords);
  const covered = new Array<boolean>(draft.length).fill(false);
  const words = draft.map((t) => t.word);
  for (let i = 0; i + minWords <= draft.length; i++) {
    if (draft.slice(i, i + minWords).some((t) => t.quoted)) continue;
    if (other.has(words.slice(i, i + minWords).join(" "))) for (let j = i; j < i + minWords; j++) covered[j] = true;
  }
  const passages: Passage[] = [];
  for (let i = 0; i < draft.length; ) {
    if (!covered[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < draft.length && covered[j]) j++;
    const run = words.slice(i, j);
    passages.push({ words: run.length, excerpt: run.length > 30 ? `${run.slice(0, 30).join(" ")} …` : run.join(" ") });
    i = j;
  }
  return passages.sort((a, b) => b.words - a.words);
}

export type PreparedText = { tokens: Token[]; words: string[]; shingles: Set<string> };

export function prepare(text: string): PreparedText {
  const tokens = tokenize(text);
  const words = tokens.map((t) => t.word);
  return { tokens, words, shingles: shingles(words) };
}

/** n-grams of the draft that are not inside quotes (quoted material does not count as overlap). */
export function unquotedShingles(tokens: readonly Token[], n = SHINGLE_WORDS): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) {
    const window = tokens.slice(i, i + n);
    if (!window.some((t) => t.quoted)) set.add(window.map((t) => t.word).join(" "));
  }
  return set;
}

export const round = (n: number) => Math.round(n * 1000) / 1000;
