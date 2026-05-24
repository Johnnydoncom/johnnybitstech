// Brand-wide constants — single source of truth.
import { Brain, Cloud, Server, Layers, Plug, BarChart3, Lock, Briefcase, Database, Bot, Workflow, MonitorSmartphone } from "lucide-react";

export const BRAND = {
  name: "Johnnybits Technology",
  short: "Johnnybits",
  tagline: "Web Design, Development & Digital Marketing",
  phone: "+234-803-130-4346",
  phoneRaw: "+2348031304346",
  email: "info@johnnybits.com",
  whatsapp: "https://wa.me/2348031304346?text=Hello%20Johnnybits%2C%20I%27d%20like%20to%20discuss%20a%20project",
  messenger: "https://m.me/johnnybitstech",
  address: "Suite 16, Sunazco Plaza, 187 Obafemi Awolowo Way, Oke-Ado, Ibadan 200252, Oyo State, Nigeria",
  city: "Ibadan",
  region: "Oyo",
  country: "Nigeria",
  socials: {
    facebook: "https://facebook.com/johnnybitstech",
    twitter: "https://twitter.com/johnnybitstech",
    instagram: "https://instagram.com/johnnybitstech",
    tiktok: "https://tiktok.com/@johnnybitstech",
    linkedin: "https://linkedin.com/company/johnnybits-technology",
  }
};

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/portfolio", label: "Portfolio" },
  // { to: "/pricing", label: "Pricing" },
  { to: "/blog", label: "Insights" },
  { to: "/contact-us", label: "Contact" },
];

export type ServiceItem = {
  slug: string;
  title: string;
  short: string;
  long: string;
  bullets: string[];
  icon: string;
  image?: string;
  intro: string;
  idealFor: string[];
  outcomes: string[];
  deliverables: string[];
  process: { title: string; detail: string }[];
  faqs: { q: string; a: string }[];
};

export const SERVICES: ServiceItem[] = [
  {
    slug: "corporate-web-design-nigeria",
    title: "Corporate Web Design",
    short: "High-performance, brand-centric web experiences designed for maximum conversion and trust.",
    long: "We craft bespoke corporate identities for the digital age. Our designs leverage 'Functional Intelligence'—merging premium aesthetics with modular Bento layouts and lightning-fast performance to ensure your brand stands out and converts.",
    bullets: ["Bento Grid Layouts", "Functional Intelligence UX", "Brand-First Visuals", "Performance-Driven Design"],
    icon: "Layout",
    image: "/assets/services/unique_corporate_web_design.png",
    intro: "Our corporate web design service is for brands that demand a dominant digital presence. We don't just build websites; we engineer brand-first experiences using 'Functional Intelligence'—a design philosophy that prioritizes speed, strategic Bento-grid layouts, and ultra-high conversion rates.",
    idealFor: ["Global brands seeking a premium digital refresh", "High-growth startups ready for a world-class UI/UX", "Enterprise firms needing performance-optimized web architectures"],
    outcomes: ["Clearer positioning and stronger first impressions", "Higher conversion rates from organic and paid traffic", "Fast-loading responsive pages that support SEO growth"],
    deliverables: ["Custom UI direction based on your brand", "Homepage and inner page UX copy structure", "Responsive development and basic technical SEO setup", "Lead capture flows, analytics and CTA placement"],
    process: [
      { title: "Discovery & positioning", detail: "We audit your current site, review competitors in Nigeria and clarify the user journey that will drive leads or sales." },
      { title: "Wireframes & visual direction", detail: "We map key pages, messaging hierarchy and interface patterns before turning them into high-impact visual designs." },
      { title: "Build & optimisation", detail: "The approved design is developed into a fast, responsive website with SEO essentials, performance tuning and testing." },
    ],
    faqs: [
      { q: "Can you redesign an existing company website?", a: "Yes. We can modernise an existing website, improve its structure, refresh copy and visuals, and preserve any content worth keeping." },
      { q: "Will the website be mobile friendly?", a: "Absolutely. Mobile responsiveness is a core part of the process because a large share of traffic in Nigeria comes from phones." },
      { q: "Do you include SEO setup in web design?", a: "Yes. We include on-page SEO basics such as structure, metadata, semantic content layout, speed optimisation and internal linking recommendations." },
    ],
  },
  {
    slug: "web-development-services",
    title: "Web Application Development",
    short: "Scalable, intelligent software solutions and custom dashboards that streamline complex business logic.",
    long: "From complex SaaS platforms to predictive analytics dashboards, we build custom web applications that empower your operations. Our 'Agentic UI' approach ensures your tools are proactive assets for growth, built on the most reliable modern stacks.",
    bullets: ["Agentic UI/UX", "Predictive Dashboards", "Scalable SaaS Architecture", "Advanced API Ecosystems"],
    icon: "Code2",
    image: "/assets/services/unique_web_app_development.png",
    intro: "Beyond basic code, we build intelligent digital ecosystems. Our web application development focuses on 'Agentic UI'—creating proactive interfaces that simplify complex business logic and scale effortlessly. We utilize the most advanced 2026 tech stacks to ensure your software is a future-proof asset.",
    idealFor: ["Businesses automating complex internal workflows", "Founders launching next-gen SaaS platforms", "Data-heavy firms needing predictive analytics dashboards"],
    outcomes: ["Less manual admin and faster internal operations", "Scalable product foundations for future features", "Secure systems with clear user flows and dependable performance"],
    deliverables: ["Product planning and technical architecture", "Frontend and backend-ready application interfaces", "API integrations and data flow design", "QA, deployment support and post-launch improvements"],
    process: [
      { title: "Product mapping", detail: "We define user roles, use cases, features and priorities so development starts from business needs instead of guesswork." },
      { title: "Interface & system build", detail: "We build the app experience with clean components, intuitive workflows and a scalable codebase." },
      { title: "Testing & rollout", detail: "Before launch we test key journeys, reduce friction points and prepare the product for confident adoption." },
    ],
    faqs: [
      { q: "Can you build a custom dashboard or portal?", a: "Yes. We build admin dashboards, client portals, booking systems, directories, internal tools and other custom platforms." },
      { q: "Do you work with existing APIs or third-party services?", a: "Yes. We can integrate payment gateways, CRMs, messaging tools, analytics platforms and custom APIs." },
      { q: "Can the app evolve after launch?", a: "Yes. We structure projects so new modules, integrations and workflow improvements can be added over time." },
    ],
  },
  {
    slug: "search-engine-optimization-seo",
    title: "SEO & Digital Marketing",
    short: "Get found on Google in Nigeria. SEO, SMO, PPC, content & analytics.",
    long: "We grow your client base through technical SEO, content marketing, social media, paid ads and analytics — drastically increasing visibility, traffic and conversions.",
    bullets: ["Local SEO Nigeria", "Google Ads & Meta Ads", "Content & Backlinks", "Analytics & Reporting"],
    icon: "TrendingUp",
    image: "/assets/services/service_seo_marketing.png",
    intro: "Our digital marketing service is designed for businesses that want measurable growth, not vanity metrics. We combine SEO, content, paid media and conversion tracking to help Johnnybits clients dominate relevant searches, attract qualified prospects and turn traffic into revenue. We tailor campaigns to Nigerian markets, search intent and local competition.",
    idealFor: ["Businesses that want more visibility on Google in Nigeria", "Brands ready to turn ad spend into qualified leads", "Companies needing a clearer content and analytics strategy"],
    outcomes: ["Higher rankings for local and industry keywords", "More qualified leads from organic and paid channels", "Clearer attribution through tracking, reporting and campaign refinement"],
    deliverables: ["Keyword research and technical SEO fixes", "Content planning, landing page optimisation and copy support", "Google Ads / Meta Ads campaign setup and refinement", "Monthly reporting with actionable insights"],
    process: [
      { title: "Audit & opportunity mapping", detail: "We review your website, keyword landscape, visibility gaps and competitors to find the fastest growth opportunities." },
      { title: "Campaign execution", detail: "We optimise pages, publish targeted content and run acquisition campaigns designed around search intent and conversion quality." },
      { title: "Measure & improve", detail: "We track performance, refine targeting and improve landing pages so the channel mix keeps getting stronger." },
    ],
    faqs: [
      { q: "How long does SEO take to show results?", a: "SEO is a medium-term growth channel. Many businesses begin seeing traction within a few months, with stronger gains building over time." },
      { q: "Do you manage paid advertising too?", a: "Yes. We run Google Ads and Meta Ads campaigns and align them with your landing pages for better conversion performance." },
      { q: "Is this service useful for businesses across Nigeria?", a: "Yes. We support brands across Nigeria and can also target regional or international audiences where needed." },
    ],
  },
  {
    slug: "ecommerce-web-development",
    title: "E-commerce Solutions",
    short: "End-to-end online stores that scale from zero to nine figures.",
    long: "Our team designs and builds end-to-end ecommerce systems on WooCommerce, Shopify and custom stacks — built for Nigerian payments, logistics and growth.",
    bullets: ["WooCommerce & Shopify", "Paystack / Flutterwave", "Inventory & Logistics", "Conversion Optimization"],
    icon: "ShoppingBag",
    image: "/assets/services/service_ecommerce.png",
    intro: "We help retailers and product-based businesses launch ecommerce systems that feel trustworthy, move customers smoothly through checkout and support growth over time. From product structure and merchandising to payment integration and CRO, our focus is building online stores that sell consistently on mobile and desktop.",
    idealFor: ["Retail brands moving sales online", "Existing stores that need better UX and checkout performance", "Multi-product businesses needing structure, inventory flow and marketing support"],
    outcomes: ["Better checkout completion and lower friction", "Stronger product presentation and merchandising", "Store foundations ready for ads, SEO and repeat sales"],
    deliverables: ["Online storefront design and product architecture", "Payment and delivery setup for Nigerian operations", "Conversion-focused cart and checkout journeys", "Analytics, coupon and remarketing foundations"],
    process: [
      { title: "Store planning", detail: "We map product categories, customer journeys, payment requirements and operational constraints before the build starts." },
      { title: "Storefront design & setup", detail: "We create a polished storefront, structure products clearly and integrate the tools needed to sell efficiently." },
      { title: "Growth optimisation", detail: "After launch we refine conversion points, tracking, merchandising and campaign-readiness so the store can scale." },
    ],
    faqs: [
      { q: "Can you integrate Nigerian payment gateways?", a: "Yes. We can integrate popular local options and configure the checkout experience around your operations." },
      { q: "Do you help with product uploads and categories?", a: "Yes. We can support category structure, product presentation and merchandising recommendations." },
      { q: "Can you improve an existing ecommerce store?", a: "Yes. We can audit and redesign stores to improve usability, mobile checkout flow and conversion performance." },
    ],
  },
  {
    slug: "mobile-apps-development",
    title: "Mobile App Development",
    short: "Beautiful Android & iOS apps for startups and enterprises.",
    long: "A leading mobile apps development team in Nigeria — we ship polished, fully-functional Android and iOS apps with React Native and Flutter.",
    bullets: ["React Native", "Flutter", "Native Android / iOS", "App Store Launch"],
    icon: "Smartphone",
    image: "/assets/services/service_mobile_apps.png",
    intro: "Johnnybits designs and develops mobile apps that are intuitive, fast and genuinely useful in day-to-day business or customer experiences. We focus on strong product logic, clean interaction design and dependable app journeys that help brands launch with confidence and keep users engaged after install.",
    idealFor: ["Founders launching consumer or business apps", "Companies extending their service into mobile experiences", "Teams needing booking, ordering, marketplace or engagement products"],
    outcomes: ["A smoother mobile experience for customers or staff", "Launch-ready Android and iOS products with clear UX", "Stronger retention through thoughtful flows and performance"],
    deliverables: ["App planning, user flow design and interface systems", "Cross-platform development for faster rollout", "QA for core mobile journeys and device responsiveness", "App publishing guidance and launch support"],
    process: [
      { title: "Product strategy", detail: "We prioritise the features that matter most to your users and shape them into a lean, launch-ready product roadmap." },
      { title: "UI design & development", detail: "We craft app screens, interactions and logic with a strong emphasis on usability, speed and clarity." },
      { title: "Launch preparation", detail: "We test the experience, reduce friction and support deployment so the app is ready for real users." },
    ],
    faqs: [
      { q: "Do you build for both Android and iPhone?", a: "Yes. We can deliver cross-platform solutions for both ecosystems depending on the product requirement." },
      { q: "Can you help validate an MVP idea?", a: "Yes. We can define a lean feature set for launch so you go to market faster without overbuilding." },
      { q: "Will the app match our brand?", a: "Yes. We design app interfaces around your brand identity while keeping usability and accessibility in focus." },
    ],
  },
  // {
  //   slug: "graphics-design",
  //   title: "Graphics Design",
  //   short: "Brand identities, flyers, banners and social creatives that pop.",
  //   long: "Passionate graphic designers based in Ibadan crafting brochures, banners, flyers, business cards and full brand identities that grab attention and build trust.",
  //   bullets: ["Logo & Brand Identity", "Social Media Creatives", "Print & Packaging", "Pitch Decks"],
  //   icon: "PenTool",
  //   image: "/assets/services/Graphic-Design-Company-in-Ibadan-Nigeria.jpg",
  //   intro: "Our graphic design service helps businesses present themselves with clarity, consistency and polish. Whether you need a stronger brand identity, campaign visuals or everyday marketing assets, we create designs that look professional, communicate quickly and support growth across digital and print touchpoints.",
  //   idealFor: ["Businesses refreshing their visual identity", "Teams that need consistent campaign and social media creatives", "Brands preparing marketing materials, proposals and presentations"],
  //   outcomes: ["A more credible and recognisable brand presence", "Design assets that support marketing performance", "Consistency across print, web and social channels"],
  //   deliverables: ["Brand direction, logos and identity systems", "Campaign graphics and social media creative sets", "Flyers, brochures, banners and sales collateral", "Presentation and pitch deck design"],
  //   process: [
  //     { title: "Brand review", detail: "We study your current visuals, audience and market space to determine what needs refinement or reinvention." },
  //     { title: "Concept development", detail: "We explore visual directions, layouts, typography and supporting assets aligned with your business goals." },
  //     { title: "Asset rollout", detail: "Final designs are prepared for the channels where they will perform best, from social feeds to printed materials." },
  //   ],
  //   faqs: [
  //     { q: "Do you only design logos?", a: "No. We also create broader identity systems, campaign creatives, sales materials, social assets and presentation graphics." },
  //     { q: "Can you work with an existing brand?", a: "Yes. We can extend an existing visual system and keep new designs aligned with your brand guidelines." },
  //     { q: "Are print-ready files included?", a: "Yes. Where relevant, assets can be prepared for both digital use and professional printing." },
  //   ],
  // },
  {
    slug: "website-maintenance-and-support",
    title: "Website Maintenance",
    short: "Keep your site fast, secure and always up — so you can focus on business.",
    long: "Our maintenance retainers cover updates, backups, security patches, performance and content edits — maximizing uptime and minimizing disruption.",
    bullets: ["Security & Backups", "Performance Tuning", "Content Updates", "24/7 Monitoring"],
    icon: "ShieldCheck",
    image: "/assets/services/service_web_maintenance.png",
    intro: "A website should keep working after launch. Our maintenance service helps businesses stay secure, current and high-performing without relying on emergency fixes. We proactively monitor, update and improve your website so downtime, broken pages and slow performance do not quietly cost you leads or sales.",
    idealFor: ["Businesses without an in-house web team", "Websites that need regular updates and protection", "Growing brands that cannot afford downtime or neglected content"],
    outcomes: ["Greater reliability and lower risk of issues", "Improved speed, uptime and user trust", "Ongoing support for updates, edits and technical fixes"],
    deliverables: ["Routine updates, backups and plugin maintenance", "Performance reviews and speed tuning", "Content edits and website housekeeping", "Monitoring and support for urgent issues"],
    process: [
      { title: "Initial health check", detail: "We assess the current website state, identify risk areas and prioritise immediate fixes or improvements." },
      { title: "Proactive maintenance", detail: "We keep the site updated, backed up and monitored so issues are caught before they become costly." },
      { title: "Continuous improvement", detail: "As the business evolves, we support content changes, performance improvements and incremental refinements." },
    ],
    faqs: [
      { q: "Do you maintain websites you did not build?", a: "Yes. We can take over maintenance for existing websites after an initial audit and cleanup where needed." },
      { q: "What happens if the website goes down?", a: "We investigate promptly, restore service where possible and address the cause to reduce repeat issues." },
      { q: "Can maintenance include content updates?", a: "Yes. Depending on the plan, we can support regular content edits, uploads and page adjustments." },
    ],
  },
];

export const OTHER_SPECIALTIES = [
  // { icon: Brain, title: "AI & Machine Learning", desc: "Intelligent automation, predictive models, NLP chatbots and AI-powered features for your products." },
  { icon: Cloud, title: "Cloud Solutions", desc: "AWS, Azure & GCP architecture, migration, and managed cloud infrastructure for scale." },
  // { icon: Server, title: "DevOps & CI/CD", desc: "Automated pipelines, containerisation, monitoring and infrastructure-as-code for faster releases." },
  { icon: Layers, title: "SaaS Development", desc: "Multi-tenant platforms with subscription billing, analytics dashboards and scalable backends." },
  { icon: Plug, title: "API Development", desc: "RESTful & GraphQL APIs, third-party integrations, payment gateways and microservices architecture." },
  { icon: BarChart3, title: "Data & Analytics", desc: "Business intelligence dashboards, data pipelines, reporting tools and actionable insights." },
  // { icon: Lock, title: "Cybersecurity", desc: "Security audits, penetration testing, compliance and secure-by-design application development." },
  { icon: Briefcase, title: "IT Consulting", desc: "Technology strategy, digital transformation roadmaps, system audits and vendor selection guidance." },
  { icon: Database, title: "Database Design", desc: "Scalable database architecture, migration, optimisation and management for PostgreSQL, MongoDB & more." },
  { icon: Bot, title: "Chatbot Development", desc: "AI-powered conversational bots for customer support, lead generation and internal workflows." },
  { icon: Workflow, title: "Workflow Automation", desc: "Business process automation, CRM integrations and custom tools that eliminate repetitive tasks." },
  { icon: MonitorSmartphone, title: "UI/UX Design", desc: "User research, wireframing, prototyping and pixel-perfect interface design that users love." },
];

export const PORTFOLIO = [
  { name: "Moonstone Digital", tags: ["SEO", "Web Development"], url: "https://moonstonedigital.ca/", image: "/assets/portfolio/Digital Marketing & Growth Agency Canada - Moonstone Digital.webp" },
  { name: "Gaidi", tags: ["Web Development"], url: "https://gaidi.de/", image: "/assets/portfolio/German-African Initiative for Development and Integration – (GAIDI) UG. WordPress Web Design.webp" },
  { name: "Largelife Furniture", tags: ["E-commerce", "SEO"], url: "https://largelifedesigns.com/", image: "/assets/portfolio/Largelife Furnitures Best Furniture company in Lagos.webp" },
  { name: "SmartGold", tags: ["Web Development"], url: "https://smartgold.com", image: "/assets/portfolio/SmartGold.jpg" },

  { name: "Paintmaster Nigeria", tags: ["Web Development"], url: "https://paintmasters.com", image: "/assets/portfolio/Paintmaster.jpg" },

  { name: "Celvz Youth Church", tags: ["Web Development"], url: "https://celvz.org/youth", image: "/assets/portfolio/Celvz-Youth-Church.jpg" },

  { name: "Gate To Africa", tags: ["SEO", "Web Development"], url: "https://gate-to-africa.de/", image: "/assets/portfolio/Gate to Africa - Entdecken Sie die Vielfalt Afrikas mit Gate to Africa - Web Design & SEO.webp" },

  { name: "SmartNetwork Technology", tags: ["SEO", "Web Development"], url: "https://smartnetwork.ng/", image: "/assets/portfolio/SmartNetwork-Technology.jpg" },

  { name: "Rukayon School Management System", tags: ["Web App Development"], url: "https://rukayon.com", image: "/assets/portfolio/Frontend-Rukayon-School-Management-System.jpg" },

  { name: "Greentide Home", tags: ["Web Design"], url: "#", image: "/assets/portfolio/Greentide Home.webp" },

  { name: "Bara.co Fashion Store", tags: ["E-commerce"], url: "https://bara.co.com/", image: "/assets/portfolio/Bara.co_.jpg" },

  { name: "Travels Insider", tags: ["Web Design", "WordPress"], url: "https://travelsinsider.com", image: "/assets/portfolio/Travels Insider.webp" },
  { name: "JKJ Builders and Developers Ltd", tags: ["WordPress", "Web Design"], url: "https://jkjbuilders.com/", image: "/assets/portfolio/JKJ Builders and Developers Ltd.webp" },
  { name: "Chester Legal Service", tags: ["Web Development"], url: "https://clsattorneys.legal/", image: "/assets/portfolio/Chester-Legal-Service.jpg" },
  { name: "Floors Nigeria", tags: ["SEO", "Web Development"], url: "https://floornigeria.com/", image: "/assets/portfolio/Floors Nigeria.webp" },
  { name: "Credify Network", tags: ["Affiliate Marketing", "Laravel", "TailwindCSS", "API Development"], url: "https://credifynetwork.com/", image: "/assets/portfolio/Unlock Possibilities and Start Earning with Affiliate Marketing Today Credify.webp" },
  { name: "Incubation World", tags: ["Laravel", "TailwindCSS", "Web Development"], url: "https://incubationworld.org/", image: "/assets/portfolio/Incubation World.webp" },
  { name: "Everything Polystyrene Concepts", tags: ["WordPress", "Web Design", "SEO"], url: "https://everythingpolystyreneconcepts.com/", image: "/assets/portfolio/Everything Polystyrene Concepts.webp" },

  { name: "Zynoplus Interiors", tags: ["Laravel", "API Development", "Web Development"], url: "https://zynoplus.com/", image: "/assets/portfolio/zynoplus.jpg" },
  { name: "Dadeb School", tags: ["Web Design", "WordPress"], url: "#", image: "/assets/portfolio/dadeb-school-lagos-nigeria.jpg" },
];


export const CLIENTS = [
  { name: "NFFG NEGA - Ehizoya Golden Entertainment", logo: "/assets/clients/EHIZOYA-GOLDEN-Logo.webp", url: "https://nollywoodawards.com" },
  { name: "Chuvie Decor", logo: "/assets/clients/chuvie-decor-logo.webp", url: "https://chuvie.com" },
  { name: "Gap Castle", logo: "/assets/clients/Gap-Castle-logo.png", url: "https://gapcastle.com" },
  { name: "Floors Nigeria", logo: "/assets/clients/floor-nigeria-logo.png", url: "https://floornigeria.com/" },
  { name: "Joseta Youth Foundation", logo: "/assets/clients/joseta_foundation_logo.png", url: "https://joyouthfoundation.org/" },
  { name: "Gaidi", logo: "/assets/clients/Gaidi_Logo-T.png", url: "https://gaidi.de/" },
  { name: "CLS Attorneys", logo: "/assets/clients/clsattorneys-official-logo.png", url: "https://clsattorneys.legal/" },
  { name: "Gate To Africa", logo: "/assets/clients/gate-to-africa-logo.png", url: "https://gate-to-africa.de/" },
  { name: "Moonstone Digital", logo: "/assets/clients/moonstone-digital-logo.png", url: "https://moonstonedigital.ca/" },

  { name: "MarinaTech", logo: "/assets/clients/marinatech-logo-small.png", url: "https://marinatech.net/" },
  { name: "Megasea Paints", logo: "/assets/clients/megasea-paints-logo.png", url: "https://megaseapaints.com" },

  { name: "Everything Polystyrene Concepts", logo: "/assets/clients/everythingpolystyrene-concepts.png", url: "https://everythingpolystyreneconcepts.com/" },
  { name: "Nuoria Global", logo: "/assets/clients/nuor-logo.png", url: "https://nuorglobal.com/" },
  { name: "Klasik Nigeria Ltd", logo: "/assets/clients/klasik polystyrene logo.png", url: "https://klasik.com.ng/" },
  { name: "Opseac", logo: "/assets/clients/opseac_logo_transparent.webp", url: "https://opseac.gy" },
  { name: "JKJ Builders and Developers Ltd", logo: "/assets/clients/JKJ Builders and Developers Ltd.webp", url: "https://jkjbuilders.com" },
  { name: "Travels Insider", logo: "/assets/clients/Travel_Insider_Logo_breit_Zeichenflache-2_103845.png", url: "https://travelsinsider.com" },

  { name: "Elsela Mart Limited", logo: "/assets/clients/Elsela Mart Limited.png", url: "https://elselamart.com/" },
  { name: "Urinak Cleaning", logo: "/assets/clients/urinak-cleaning-london-united-kingdom-logo.png", url: "https://urinakcleaning.com/" },
  { name: "Atlantic Pro Hub Ltd", logo: "/assets/clients/Atlantic-pro-hub-ltd.webp", url: "https://atlanticprohub.com/" },
  { name: "Aureum Lounge", logo: "/assets/clients/Aureum Lounge.png", url: "https://aureumlagos.com" },
  { name: "Austin Amlabu Initiatives", logo: "/assets/clients/Austn-Amlabu-Initiatives.png", url: "https://austinamlabuinitiatives.com" },
  { name: "Banex", logo: "/assets/clients/Banex Redesign.png", url: "https://banexmall.com" },
  { name: "Bon Voyage Hotel", logo: "/assets/clients/bonvoyage-logo.png", url: "#" },

];
