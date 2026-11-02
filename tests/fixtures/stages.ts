/**
 * One complete, valid set of stage outputs for a single run. Used by integration tests and as
 * worked examples for the Cowork stage skills. Sources are placeholders (example.org) — fixtures only.
 */
export const KEYWORD = "how much does a website cost in nigeria";

export const s1 = {
  primary_keyword: "website cost in Nigeria",
  search_intent: "commercial",
  audience: "Nigerian SME owners budgeting for a new business website",
  locale: { country: "NG", is_local_intent: true, cities: ["Lagos", "Ibadan", "Abuja"] },
  secondary_keywords: ["website design price in Nigeria", "cost of ecommerce website Nigeria", "website maintenance cost"],
  questions: ["How much is a basic website in Nigeria?", "Why do website prices vary so much?"],
  serp_features: ["People also ask", "Featured snippet"],
  content_type: "cost_breakdown",
  target_word_count: 1600,
};

export const s3 = {
  working_title: "How Much Does a Website Cost in Nigeria? A Practical Price Guide",
  angle: "Break costs into the parts a business actually pays for, with ranges and the assumptions behind them.",
  reader_outcome: "The reader can estimate a realistic budget and knows which questions to ask a developer.",
  h2_plan: ["What drives website cost", "Typical price ranges by website type", "Ongoing costs after launch", "How to keep costs under control", "Frequently asked questions"],
  must_cover: ["Domain and hosting", "Design and development", "E-commerce features and payment gateways"],
  eeat: { author_slug: "odoh-john", experience_angles: ["Johnnybits builds corporate websites and online stores (see services)"] },
  internal_link_targets: [{ url: "/ecommerce-web-development", reason: "Readers pricing an online store" }],
  cta: { label: "Book a free 30-minute strategy call", url: "/contact-us" },
  word_count_target: 1600,
  avoid: ["Quoting Johnnybits' own prices"],
};

const today = "2026-11-02";
export const s4 = {
  items: [
    { id: "r1", claim: "Domain registration for .com.ng is priced annually by accredited registrars.", type: "fact", source_url: "https://example.org/nira-domains", publisher: "Example Registry", published_date: "2026", accessed_date: today, confidence: "high", nigeria_specific: true },
    { id: "r2", claim: "Shared hosting plans are commonly billed monthly or annually.", type: "fact", source_url: "https://example.org/hosting-plans", publisher: "Example Hosting", published_date: "2026-05", accessed_date: today, confidence: "medium", nigeria_specific: false },
    { id: "r3", claim: "Payment gateways charge a percentage fee per local card transaction.", type: "statistic", source_url: "https://example.org/gateway-pricing", publisher: "Example Payments", published_date: "2026-03-01", accessed_date: today, confidence: "high", quote: "Local transactions are charged a percentage plus a flat fee.", nigeria_specific: true },
    { id: "r4", claim: "Small businesses often underestimate maintenance and content update costs.", type: "opinion", source_url: "https://example.org/maintenance-survey", publisher: "Example Research", published_date: null, accessed_date: today, confidence: "low", nigeria_specific: false },
  ],
};

export const s5 = {
  markdown: [
    "## What drives website cost",
    "- Scope, design depth, content, integrations",
    "## Typical price ranges by website type",
    "- Table: website type vs what is included vs cost drivers",
    "## Ongoing costs after launch",
    "- Hosting, domain renewal, maintenance",
    "## How to keep costs under control",
    "- Phased launch, reuse content",
    "## Frequently asked questions",
    "- Two to four questions from s1",
  ].join("\n"),
  table_plan: "Website type vs what is included vs main cost drivers, in the price ranges section.",
  cta_placement: "After the cost-control section and at the end.",
};

const para = (topic: string) =>
  `When you plan ${topic}, it helps to separate one-off costs from recurring ones so the budget does not surprise you later. ` +
  "Ask every developer to itemise their quote so you can compare like with like across proposals.";

export const s6 = {
  title: "How Much Does a Website Cost in Nigeria? A Practical Price Guide",
  markdown: [
    "Most businesses can estimate their website budget once they know which parts they are paying for.",
    "",
    "## What drives website cost",
    "",
    para("a business website"),
    "",
    "Your domain name is renewed every year through an accredited registrar.[^r1] " + para("the domain"),
    "",
    "## Typical price ranges by website type",
    "",
    "| Website type | What is included | Main cost drivers |",
    "|---|---|---|",
    "| Brochure site | 5–8 pages, contact form | Design depth, copywriting |",
    "| Online store | Catalogue, cart, checkout | Products, payment gateway, delivery rules |",
    "",
    "If you plan to sell online, an ecommerce website needs product management, checkout and payment integration. Every card payment also attracts a gateway fee.[^r3]",
    "",
    "## Ongoing costs after launch",
    "",
    "Hosting is billed monthly or yearly depending on the plan.[^r2] " + para("hosting"),
    "",
    "Many small businesses underestimate maintenance.[^r4] " + para("maintenance"),
    "",
    "## How to keep costs under control",
    "",
    para("a phased launch"),
    "",
    "## Frequently asked questions",
    "",
    "### How much is a basic website in Nigeria?",
    "",
    "It depends on scope; get itemised quotes and compare them line by line.",
    "",
    "### Why do website prices vary so much?",
    "",
    "Quotes differ in design depth, content and integrations.",
    "",
    "[^r1]: [Example Registry — domain pricing](https://example.org/nira-domains), 2026.",
    "[^r2]: [Example Hosting — plans](https://example.org/hosting-plans), May 2026.",
    "[^r3]: [Example Payments — pricing](https://example.org/gateway-pricing), 1 March 2026.",
    "[^r4]: [Example Research — maintenance survey](https://example.org/maintenance-survey).",
  ].join("\n"),
};

export const s8 = {
  links: [
    {
      url: "/ecommerce-web-development",
      anchor_text: "ecommerce website",
      sentence: "If you plan to sell online, an ecommerce website needs product management, checkout and payment integration.",
      reason: "Readers pricing an online store",
    },
  ],
};

export const s7 = {
  meta_title: "Website Cost in Nigeria: A Practical Price Guide",
  meta_description:
    "What a website really costs in Nigeria: one-off and ongoing costs, typical ranges by website type, and how to keep your budget under control.",
  slug_suggestion: "website-cost-in-nigeria",
  category: "Web Design",
  tags: ["Website cost", "Web design", "Nigeria"],
  image_prompt: "Flat illustration of a laptop showing a website wireframe next to a naira price tag, brand teal palette",
  image_alt: "Laptop with a website wireframe beside a naira price tag",
  faq: [
    { question: "How much is a basic website in Nigeria?", answer: "It depends on scope; get itemised quotes and compare them line by line." },
    { question: "Why do website prices vary so much?", answer: "Quotes differ in design depth, content and integrations." },
  ],
};

export const s9Pass = { verdict: "PASS", summary: "Accurate, sourced and on-brief.", issues: [{ severity: "minor", location: "Intro", problem: "Could be shorter", exact_revision: "Trim the first sentence." }] };
export const s9Fail = { verdict: "FAIL", summary: "One unsupported claim.", issues: [{ severity: "major", location: "Ongoing costs", problem: "Claim lacks a source", exact_revision: "Add citation [^r2] after the hosting sentence." }] };
