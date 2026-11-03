import { BRAND, PORTFOLIO, SERVICES } from "@/lib/brand";
import { SITE_URL } from "@/config/site";
import { brandContextChecked, type BrandContext } from "./schema";

/**
 * Brand context served to the agent by `get_brand_context`.
 * Derived from src/lib/brand.ts (the site's own source of truth) so the two cannot drift.
 * Only add to `approvedClaims` after the owner has verified the claim and its evidence.
 */
const brandContext: BrandContext = {
  version: "2026-11-02",
  company: {
    name: BRAND.name,
    shortName: BRAND.short,
    siteUrl: SITE_URL,
    summary:
      "Web design, web and mobile app development, SEO and digital marketing agency serving startups, SMEs, schools, churches and organisations across Nigeria.",
    headquarters: BRAND.address,
    registration: "Registered in Lagos (Corporate Affairs Commission); based in Ibadan, Oyo State.",
    serviceArea: "Nigeria, with clients abroad",
    contact: { email: BRAND.email, phone: BRAND.phone, whatsapp: BRAND.whatsapp },
  },
  audience: [
    "Nigerian SME owners and founders deciding on a website, store or app",
    "Marketing and operations leads at Nigerian companies, schools and churches",
    "Startup teams in Lagos, Ibadan, Abuja and Port Harcourt choosing a tech partner or stack",
  ],
  tone: {
    voice: ["practical", "plain English", "Nigeria-aware", "honest about trade-offs", "confident without hype"],
    language: "British/Nigerian English spelling (optimise, organisation); naira as ₦ with thousands separators",
    do: [
      "Answer the searcher's question in the first 100 words",
      "Use concrete Nigerian context (payments, power, data costs, NDPA/NDPR) where it is relevant and sourced",
      "Give costs and timelines as ranges with stated assumptions, citing sources",
      "Recommend talking to Johnnybits only where it genuinely helps the reader",
    ],
    dont: [
      "Invent statistics, quotes, clients, testimonials, case studies or results",
      "Use superlatives about Johnnybits (best, leading, number one)",
      "Use filler intros such as 'In today's digital age', or keyword stuffing",
      "Link to any URL the connector did not return",
    ],
  },
  services: SERVICES.map((s) => ({ name: s.title, url: `/${s.slug}`, summary: s.short, idealFor: s.idealFor })),
  ctas: [
    { label: "Book a free 30-minute strategy call", url: "/contact-us", when: "End of article; at most once mid-article" },
    { label: "Chat with us on WhatsApp", url: BRAND.whatsapp, when: "Alternative CTA for quick questions" },
    { label: "See our work", url: "/portfolio", when: "When the article discusses a type of project we have delivered" },
  ],
  portfolio: PORTFOLIO.filter((p) => /^https:\/\//.test(p.url)).map((p) => ({
    name: p.name,
    url: p.url,
    services: [...p.tags],
    usage: "name-and-services-only" as const,
  })),
  authors: [
    {
      slug: "odoh-john",
      name: "Odoh John",
      jobTitle: "Software Developer",
      url: `${SITE_URL}/about-the-web-design-company`,
      sameAs: ["https://ng.linkedin.com/in/johnnybits"],
    },
  ],
  defaultAuthorSlug: "odoh-john",
  approvedClaims: [],
  bannedClaims: [
    { pattern: "5+ years / 10+ years in business", reason: "Contradictory across pages; unverified", regex: String.raw`\b(5|10)\s*\+\s*years?\b` },
    { pattern: "80+ projects / 150+ websites & apps shipped", reason: "Contradictory across pages; unverified", regex: String.raw`\b(80|150)\s*\+\s*(projects|websites|apps|clients)` },
    { pattern: "+312% average traffic growth", reason: "Unverified marketing figure", regex: String.raw`312\s*%` },
    { pattern: "45% lower cost-per-lead", reason: "Unverified marketing figure", regex: String.raw`45\s*%\s*(lower|less|reduction|cheaper)` },
    { pattern: "5.0★ Google rating", reason: "Unverified; ratings change", regex: String.raw`5(\.0)?\s*(★|stars?\b)|5\.0\s*(on|google)` },
    { pattern: "100% senior talent on every project", reason: "Unverified marketing claim", regex: String.raw`100\s*%\s*senior` },
    { pattern: "12+ industries served", reason: "Unverified marketing figure", regex: String.raw`\b12\s*\+\s*industr` },
    { pattern: "E-commerce funnel 100% / 68% / 42% / 39%", reason: "Illustrative graphic, not data", regex: String.raw`\b68\s*%[^.]{0,80}\b42\s*%` },
    { pattern: "₦150,000 → ₦5,000/month hosting (97% reduction)", reason: "Unsourced figure in an existing post", regex: String.raw`97\s*%\s*(reduction|cheaper|less|saving)|₦\s*150,?000[^.]{0,60}₦\s*5,?000` },
    { pattern: "60–70% less JavaScript with Server Components", reason: "Unsourced figure in an existing post", regex: String.raw`60\s*[-–]\s*70\s*%\s*less` },
  ],
  pendingVerification: [{ statement: "Johnnybits Technology started in 2019", foundOn: "/about-the-web-design-company" }],
};

export function getBrandContext(): BrandContext {
  return brandContextChecked.parse(brandContext);
}
