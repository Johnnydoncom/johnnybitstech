import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";

/** Minimal mdast node shape used by the validators (avoids depending on @types/mdast). */
export type MdNode = {
  type: string;
  depth?: number;
  identifier?: string;
  url?: string;
  value?: string;
  children?: MdNode[];
  position?: { start: { offset?: number; line: number }; end: { offset?: number; line: number } };
};

export function parseMarkdown(markdown: string): MdNode {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdNode;
}

/** Depth-first walk with the ancestor chain (nearest last). */
export function walk(node: MdNode, visit: (n: MdNode, ancestors: MdNode[]) => void, ancestors: MdNode[] = []) {
  visit(node, ancestors);
  for (const child of node.children ?? []) walk(child, visit, [...ancestors, node]);
}

export function textOf(node: MdNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

export function headings(tree: MdNode): { depth: number; text: string }[] {
  const out: { depth: number; text: string }[] = [];
  walk(tree, (n) => n.type === "heading" && out.push({ depth: n.depth ?? 0, text: textOf(n).trim() }));
  return out;
}

/** Plain text of the body, excluding footnote definitions, with block boundaries as spaces. */
export function bodyText(tree: MdNode): string {
  const parts: string[] = [];
  const collect = (n: MdNode) => {
    if (n.type === "footnoteDefinition" || n.type === "image" || n.type === "html") return;
    if (typeof n.value === "string") parts.push(n.value);
    for (const c of n.children ?? []) collect(c);
  };
  collect(tree);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/u).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}
