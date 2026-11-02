import { z } from "zod";
import { getBrandContext } from "../brand/johnnybits";
import { brandContextSchema } from "../brand/schema";
import { searchSiteContent } from "../retrieval/lexical";
import { defineTool } from "./types";

export const getBrandContextTool = defineTool({
  name: "get_brand_context",
  title: "Get Johnnybits brand context",
  description:
    "Company facts, services with canonical URLs, tone, CTAs, authors, portfolio projects usable as examples (name and services only), " +
    "approved claims, banned claims and claims pending verification. Call first in every session. " +
    "Never state a figure or claim about Johnnybits that is not in approvedClaims.",
  input: z.object({}),
  output: brandContextSchema,
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async () => getBrandContext(),
});

export const searchSiteContentTool = defineTool({
  name: "search_site_content",
  title: "Search published site content",
  description:
    "Searches published blog articles and site pages (services, portfolio, contact). Use it to place a keyword (s2), " +
    "pick internal link targets for the brief (s3) and find related articles. Only URLs returned here or by get_brand_context may be linked.",
  input: z.object({
    query: z.string().trim().min(2).max(300),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  output: z.object({
    results: z.array(
      z.object({
        kind: z.enum(["article", "link_target"]),
        id: z.string(),
        url: z.string(),
        title: z.string(),
        summary: z.string(),
        score: z.number(),
      }),
    ),
  }),
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (ctx, input) => ({ results: await searchSiteContent(ctx.db, input.query, { limit: input.limit }) }),
});
