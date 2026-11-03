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
  target_word_count: 800,
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
  word_count_target: 800,
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

export const s6 = {
  title: "How Much Does a Website Cost in Nigeria? A Practical Price Guide",
  markdown: [
    "Working out the website cost in Nigeria is easier once you know which parts you are paying for. Most quotes combine one-off work, such as design and development, with recurring costs that continue for as long as the site is live. This guide walks through each part so you can build a realistic budget and compare proposals with confidence.",
    "",
    "## What drives website cost in Nigeria",
    "",
    "Scope is the biggest driver. A small brochure site with a handful of pages needs far less design and testing than a platform with customer accounts, search and integrations. Every extra feature adds planning, building and checking time, and that time is what a developer charges for.",
    "",
    "Your domain name is renewed every year through an accredited registrar.[^r1] Choose a name early, register it in the business name rather than a developer's personal account, and keep the login details somewhere safe so that renewals never lapse.",
    "",
    "Design depth matters too. A template adapted to your brand is quicker to deliver than a custom design built around your customers' journeys. Custom work costs more, but it often converts better because every page is planned around what visitors need to do next.",
    "",
    "Integrations add cost as well. Connecting the site to an accounting package, a customer database, a delivery partner or a booking calendar means extra development and testing, because each connection has its own rules and failure cases. List the systems your team already uses so the developer can price these connections from the start rather than discovering them halfway through the project.",
    "",
    "Content is the cost many businesses forget. Someone has to write the service descriptions, take product photos and gather testimonials from real customers. If your team cannot produce this material, budget for a copywriter or photographer as part of the project.",
    "",
    "## Typical price ranges by website type",
    "",
    "| Website type | What is included | Main cost drivers |",
    "|---|---|---|",
    "| Brochure site | 5–8 pages, contact form | Design depth, copywriting |",
    "| Online store | Catalogue, cart, checkout | Products, payment gateway, delivery rules |",
    "| Web application | User accounts, dashboards | Features, integrations, security |",
    "",
    "If you plan to sell online, an ecommerce website needs product management, checkout and payment integration. Every card payment also attracts a gateway fee, so include those charges when you model your margins.[^r3]",
    "",
    "Web applications sit at the top of the range because they behave more like software products than websites. They need careful planning of user roles, data and security, and they usually grow in phases after the first release.",
    "",
    "## Ongoing costs after launch",
    "",
    "Hosting is billed monthly or yearly depending on the plan you choose.[^r2] Cheap shared hosting can be fine for a small site, but a busy store needs reliable servers, regular backups and enough capacity for sales periods.",
    "",
    "A website maintenance plan covers updates, backups and security monitoring after launch. Without one, plugins and frameworks fall out of date, and small problems turn into outages that cost far more to fix than regular care would have.",
    "",
    "Many small businesses underestimate maintenance and content updates.[^r4] Set aside a modest monthly amount for changes such as new pages, seasonal promotions and price updates, so the site keeps pace with the business instead of slowly going stale.",
    "",
    "## How to keep costs under control",
    "",
    "Before you sign, ask for an itemised quote that lists every page, feature and integration. A clear breakdown makes proposals comparable and shows exactly what you can remove or postpone if the budget is tight.",
    "",
    "Launch in phases. Start with the pages and features that bring in enquiries or sales, measure how visitors use them, and add the rest once you have real data. Phasing spreads the cost and keeps you from paying for features nobody uses.",
    "",
    "Reuse what you already have. Existing logos, photos, product descriptions and brand colours all reduce design and content time. Gather them before the project starts so your developer is not waiting on material halfway through the build.",
    "",
    "Finally, agree on ownership. Make sure the domain, hosting account, source code and analytics are registered to your business, and that you receive the logins at handover. This protects your investment if you ever change developers.",
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
    {
      url: "/website-maintenance-and-support",
      anchor_text: "website maintenance plan",
      sentence: "A website maintenance plan covers updates, backups and security monitoring after launch.",
      reason: "Explains the ongoing care service",
    },
    {
      url: "/contact-us",
      anchor_text: "itemised quote",
      sentence: "Before you sign, ask for an itemised quote that lists every page, feature and integration.",
      reason: "Next step for readers ready to get a quote",
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
