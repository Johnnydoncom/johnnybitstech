import { unified } from "unified";
import rehypeParse from "rehype-parse";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { toString as hastToString } from "hast-util-to-string";
import type { Element, Root, RootContent } from "hast";
import type { ContentFormat } from "@/db/schema";
import { slugify } from "../seo/slug";
import { contentHash } from "../hash";

export type Chunk = {
  scope: "full" | "intro" | "section" | "faq" | "meta";
  section_key: string;
  heading: string | null;
  body: string;
  content_hash: string;
};

/** Longest chunk body kept (embedding models cap input; lexical search does not need more). */
const MAX_CHUNK_CHARS = 8_000;

function toHast(content: string, format: ContentFormat): Root {
  if (format === "html") return unified().use(rehypeParse, { fragment: true }).parse(content) as Root;
  const md = unified().use(remarkParse).use(remarkGfm);
  return unified().use(remarkRehype).runSync(md.parse(content)) as Root;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const isHeading = (n: RootContent, level: number): n is Element => n.type === "element" && n.tagName === `h${level}`;
const isFootnotes = (n: RootContent) => n.type === "element" && n.tagName === "section" && "dataFootnotes" in (n.properties ?? {});

function make(scope: Chunk["scope"], key: string, heading: string | null, body: string): Chunk {
  const text = clean(body).slice(0, MAX_CHUNK_CHARS);
  return { scope, section_key: key, heading, body: text, content_hash: contentHash(scope, key, heading, text) };
}

/**
 * Splits an article into retrieval units: full text, intro (before the first H2), one chunk per H2 section,
 * the FAQ (questions + answers) and the meta text. Footnote definitions are left out.
 */
export function buildChunks(input: {
  title: string;
  content: string;
  format: ContentFormat;
  metaTitle?: string | null;
  metaDescription?: string | null;
  faq?: { question: string; answer: string }[] | null;
}): Chunk[] {
  const nodes = toHast(input.content, input.format).children.filter((n) => !isFootnotes(n));
  const sections: { heading: string | null; nodes: RootContent[] }[] = [{ heading: null, nodes: [] }];
  for (const node of nodes) {
    if (isHeading(node, 2)) sections.push({ heading: clean(hastToString(node)), nodes: [] });
    else sections[sections.length - 1].nodes.push(node);
  }
  const textOf = (ns: RootContent[]) => ns.map((n) => hastToString(n as Element)).join(" ");

  const chunks: Chunk[] = [make("full", "", input.title, `${input.title}. ${textOf(nodes)}`)];
  const intro = textOf(sections[0].nodes);
  if (clean(intro)) chunks.push(make("intro", "", input.title, intro));

  const used = new Set<string>();
  for (const section of sections.slice(1)) {
    const isFaq = /faq|frequently asked/i.test(section.heading ?? "");
    if (isFaq && input.faq?.length) continue; // covered by the faq chunk
    let key = slugify(section.heading ?? "section") || "section";
    for (let n = 2; used.has(key); n++) key = `${slugify(section.heading ?? "section")}-${n}`;
    used.add(key);
    chunks.push(make(isFaq ? "faq" : "section", key, section.heading, `${section.heading}. ${textOf(section.nodes)}`));
  }
  if (input.faq?.length) chunks.push(make("faq", "", "FAQ", input.faq.map((f) => `${f.question} ${f.answer}`).join(" ")));
  const meta = [input.metaTitle, input.metaDescription].filter(Boolean).join(". ");
  if (meta) chunks.push(make("meta", "", input.metaTitle ?? null, meta));
  return chunks.filter((c) => c.body.length > 0);
}
