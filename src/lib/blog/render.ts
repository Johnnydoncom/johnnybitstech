import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { Element, Root } from "hast";
import type { ContentFormat } from "@/db/schema";
import { SITE_URL } from "@/config/site";

/**
 * GitHub-style sanitising, extended for the legacy Quill HTML:
 * Quill alignment classes, and inline styles on images (legacy posts set radius/margin inline).
 */
const schema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), ["className", /^ql-[a-z0-9-]+$/]],
    img: [...(defaultSchema.attributes?.img ?? []), "style", "loading", "width", "height"],
    a: [...(defaultSchema.attributes?.a ?? []), "title"],
  },
};

/**
 * Markdown articles: raw HTML is never passed through (remark-rehype drops it), so the only ids are the
 * footnote ids remark-rehype generates (already prefixed "user-content-"). Re-prefixing them would break
 * every citation link, so the clobber prefix is disabled for this pipeline only.
 */
const markdownSchema: SanitizeSchema = { ...schema, clobberPrefix: "" };

const SITE_HOST = new URL(SITE_URL).host;

/** Adds safe rel/target to outbound links; internal links are left untouched. */
function rehypeExternalLinks() {
  return (tree: Root) => {
    const visit = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (child.tagName === "a" && typeof child.properties.href === "string") {
          const href = child.properties.href;
          if (/^https?:\/\//i.test(href) && new URL(href).host !== SITE_HOST) {
            child.properties.rel = ["noopener", "noreferrer"];
            child.properties.target = "_blank";
          }
        }
        if (child.tagName === "img" && !child.properties.loading) {
          child.properties.loading = "lazy";
        }
        visit(child);
      }
    };
    visit(tree);
  };
}

const htmlPipeline = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, schema)
  .use(rehypeSlug)
  .use(rehypeExternalLinks)
  .use(rehypeStringify);

const markdownPipeline = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, markdownSchema)
  .use(rehypeSlug)
  .use(rehypeExternalLinks)
  .use(rehypeStringify);

/** Renders stored article content to sanitised HTML for `.blog-content`. */
export function renderArticleHtml(content: string, format: ContentFormat): string {
  const pipeline = format === "html" ? htmlPipeline : markdownPipeline;
  return String(pipeline.processSync(content));
}
