import { SERVICES } from "@/lib/brand";

export type LinkTargetSeed = {
  url: string;
  title: string;
  summary: string;
  type: "service" | "portfolio" | "contact" | "category" | "pillar" | "page";
  keywords: string[];
};

/**
 * Non-article pages the agent may link to. Only canonical URLs (docs/blog-agent-plan.md 2.2).
 * Services come from src/lib/brand.ts so retired services (commented out there) are never linked.
 */
export function linkTargetSeeds(): LinkTargetSeed[] {
  const services: LinkTargetSeed[] = SERVICES.map((s) => ({
    url: `/${s.slug}`,
    title: s.title,
    summary: `${s.short} ${s.intro}`,
    type: "service",
    keywords: [...s.bullets],
  }));

  return [
    ...services,
    {
      url: "/services",
      title: "Our Services",
      summary: "Overview of Johnnybits Technology services: corporate web design, web application development, SEO and digital marketing, e-commerce, mobile apps and website maintenance.",
      type: "page",
      keywords: ["services", "web design", "web development", "SEO", "mobile apps"],
    },
    {
      url: "/portfolio",
      title: "Our Work",
      summary: "Portfolio of websites, online stores and web applications built by Johnnybits Technology for clients in Nigeria and abroad.",
      type: "portfolio",
      keywords: ["portfolio", "case studies", "projects", "websites we built"],
    },
    {
      url: "/contact-us",
      title: "Contact Johnnybits Technology",
      summary: "Book a free 30-minute strategy call or request a quote for a website, app, online store or SEO project.",
      type: "contact",
      keywords: ["contact", "get a quote", "strategy call", "hire a web developer"],
    },
    {
      url: "/about-the-web-design-company",
      title: "About Johnnybits Technology",
      summary: "Web design and development company registered in Lagos and based in Ibadan, serving businesses across Nigeria.",
      type: "page",
      keywords: ["about", "web design company Ibadan", "web design company Nigeria"],
    },
    {
      url: "/blog",
      title: "Johnnybits Blog",
      summary: "Practical articles on web development, SEO, e-commerce and digital growth for Nigerian businesses.",
      type: "category",
      keywords: ["blog", "insights", "guides"],
    },
  ];
}
