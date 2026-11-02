import { z } from "zod";

const sitePath = z.string().regex(/^\/[a-z0-9/-]*$/, "Must be a site path such as /contact-us");

export const brandContextSchema = z.object({
  version: z.string(),
  company: z.object({
    name: z.string(),
    shortName: z.string(),
    siteUrl: z.string().url(),
    summary: z.string(),
    headquarters: z.string(),
    registration: z.string(),
    serviceArea: z.string(),
    contact: z.object({ email: z.string().email(), phone: z.string(), whatsapp: z.string().url() }),
  }),
  audience: z.array(z.string()).min(1),
  tone: z.object({
    voice: z.array(z.string()).min(1),
    language: z.string(),
    do: z.array(z.string()),
    dont: z.array(z.string()),
  }),
  services: z
    .array(z.object({ name: z.string(), url: sitePath, summary: z.string(), idealFor: z.array(z.string()) }))
    .min(1),
  ctas: z.array(z.object({ label: z.string(), url: z.union([sitePath, z.string().url()]), when: z.string() })).min(1),
  portfolio: z.array(
    z.object({
      name: z.string(),
      url: z.string().url(),
      services: z.array(z.string()),
      /** Only that Johnnybits delivered these services may be said. No outcomes or metrics. */
      usage: z.literal("name-and-services-only"),
    }),
  ),
  authors: z.array(
    z.object({
      slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
      name: z.string(),
      jobTitle: z.string(),
      url: z.string().url().nullable(),
      sameAs: z.array(z.string().url()),
    }),
  ).min(1),
  /** Author credited on articles that do not name one (legacy posts and the Quill editor). */
  defaultAuthorSlug: z.string(),
  /** Claims the writer may state as fact about Johnnybits. Empty until the owner verifies them. */
  approvedClaims: z.array(z.object({ claim: z.string(), evidence: z.string() })),
  /** Figures and phrases that must never appear in agent output (unverified or contradictory). */
  bannedClaims: z.array(z.object({ pattern: z.string(), reason: z.string() })),
  /** Statements found on the site that are plausible but not yet verified by the owner. Do not use. */
  pendingVerification: z.array(z.object({ statement: z.string(), foundOn: sitePath })),
});

export type BrandContext = z.infer<typeof brandContextSchema>;

export const brandContextChecked = brandContextSchema.refine(
  (b) => b.authors.some((a) => a.slug === b.defaultAuthorSlug),
  { message: "defaultAuthorSlug must match one of the authors", path: ["defaultAuthorSlug"] },
);
