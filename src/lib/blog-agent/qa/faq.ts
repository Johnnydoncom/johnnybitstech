import { parseMarkdown, textOf } from "../markdown";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Questions (H3) and answers (text until the next heading) in the article's H2 FAQ section, in order. */
export function extractFaq(markdown: string): { question: string; answer: string }[] {
  const children = parseMarkdown(markdown).children ?? [];
  const start = children.findIndex((c) => c.type === "heading" && c.depth === 2 && /faq|frequently asked/i.test(textOf(c)));
  if (start < 0) return [];
  const faq: { question: string; answer: string }[] = [];
  for (const node of children.slice(start + 1)) {
    if (node.type === "heading" && (node.depth ?? 0) <= 2) break;
    if (node.type === "heading" && node.depth === 3) faq.push({ question: norm(textOf(node)), answer: "" });
    else if (faq.length && node.type !== "footnoteDefinition") faq[faq.length - 1].answer = norm(`${faq[faq.length - 1].answer} ${textOf(node)}`);
  }
  return faq.filter((f) => f.question && f.answer);
}
