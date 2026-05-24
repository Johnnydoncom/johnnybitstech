const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const POSTS = [
  {
    title: "The Best E-commerce Payment Gateways in Nigeria for 2026",
    slug: "best-ecommerce-payment-gateways-nigeria-2026",
    excerpt: "Comparing Paystack, Flutterwave, and Monnify for speed, reliability, and developer experience in the Nigerian market.",
    content: `<p>If you're building an e-commerce platform in Nigeria in 2026, choosing the right payment gateway is the most critical technical decision you will make. With the rise of sophisticated mobile commerce, customers in Lagos, Abuja, and Port Harcourt expect zero friction when checking out.</p>
    <img src="/assets/blog/ecommerce_payment_nigeria.png" alt="Nigerian e-commerce payment app" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Paystack vs Flutterwave vs Monnify</h2>
    <p>Paystack remains the developer darling for its incredibly clean API and webhook reliability. Flutterwave's multi-currency support makes it indispensable for Nigerian startups looking to expand across Africa. Monnify, backed by Moniepoint, has rapidly gained market share for its rock-solid virtual account infrastructure, which is highly preferred by B2B businesses.</p>
    <p>Transaction fees are a major factor for Nigerian merchants. Paystack charges 1.5% + ₦100 (capped at ₦2,000) for local transactions, making it the most affordable option for high-volume stores. Flutterwave's split payment feature — which allows marketplace platforms to automatically distribute funds to multiple vendors — is a game changer for multi-seller platforms. Monnify's reserved account model eliminates gateway fees entirely for bank transfer payments, which remain the preferred method for many Nigerian consumers.</p>
    <h2>Integration and Developer Experience</h2>
    <p>From a developer's perspective, Paystack's documentation is the gold standard. Their inline JavaScript SDK can be integrated in under 30 minutes, and their webhook system is battle-tested for reliability. Flutterwave offers more payment method diversity — including USSD, mobile money for West African expansion, and even Apple Pay — but their documentation can be inconsistent across API versions.</p>
    <h2>Which One Should You Choose?</h2>
    <p>For a standard Nigerian e-commerce store, Paystack is the safest choice. For a pan-African marketplace that needs to accept payments from Ghana, Kenya, or South Africa, Flutterwave is the clear winner. For B2B platforms where bank transfers dominate, Monnify will save you significant transaction costs. Many successful Nigerian platforms actually integrate two or three gateways simultaneously, allowing customers to choose their preferred payment method at checkout.</p>`,
    tag: "E-commerce",
    published: true,
    featured_image: "/assets/blog/ecommerce_payment_nigeria.png",
    meta_title: "Best E-commerce Payment Gateways in Nigeria (2026) | Johnnybits",
    meta_description: "A developer's guide to the best e-commerce payment gateways in Nigeria for 2026. Compare Paystack, Flutterwave, and Monnify.",
  },
  {
    title: "Why Lagos Startups Are Switching to Next.js & Serverless",
    slug: "lagos-startups-switching-to-nextjs-serverless",
    excerpt: "How edge computing and server-side rendering are solving latency issues and reducing cloud costs for Nigerian tech companies.",
    content: `<p>The Nigerian startup ecosystem, particularly in Lagos, has reached a new level of technical maturity in 2026. The days of monolithic, slow-loading applications are over. Today, speed is the primary currency, and Next.js is the framework of choice.</p>
    <img src="/assets/blog/lagos_nextjs_serverless.png" alt="Next.js development in Lagos" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>The End of Loading Spinners</h2>
    <p>By leveraging Serverless architecture and Edge rendering, companies are serving applications from nodes closer to the user. A user in Yaba connecting via a 4G network experiences near-instant load times. Next.js App Router and Server Components have fundamentally changed how we build for the African web.</p>
    <h2>Why Server Components Matter for Nigeria</h2>
    <p>React Server Components allow developers to run complex data fetching and rendering logic on the server, sending only the final HTML to the client. This dramatically reduces the JavaScript bundle size — a critical advantage when your users are on data-conscious mobile plans. A typical Next.js app built with Server Components can ship 60-70% less JavaScript than an equivalent client-side React app.</p>
    <h2>The Cost Advantage of Serverless</h2>
    <p>Traditional hosting models require Nigerian startups to pay for servers running 24/7, even when traffic is low. Serverless platforms like Vercel and AWS Lambda charge only for actual compute time. For an early-stage Lagos startup receiving 10,000 monthly visitors, this can reduce infrastructure costs from ₦150,000/month to under ₦5,000/month — a 97% reduction that frees up capital for product development and marketing.</p>
    <h2>Real-World Success Stories</h2>
    <p>Several prominent Nigerian fintechs and logistics platforms have already migrated to this stack. The results are consistent: faster page loads, better SEO rankings on Google Nigeria, lower hosting bills, and happier development teams. The combination of TypeScript safety, automatic code splitting, and built-in image optimization makes Next.js the most productive framework available for African developers today.</p>`,
    tag: "Software Development",
    published: true,
    featured_image: "/assets/blog/lagos_nextjs_serverless.png",
    meta_title: "Why Lagos Startups Use Next.js & Serverless | Johnnybits",
    meta_description: "Discover why tech startups in Lagos, Nigeria are adopting Next.js and serverless architecture to combat latency and scale globally.",
  },
  {
    title: "SEO in Nigeria: How to Rank Locally on Google in 2026",
    slug: "seo-in-nigeria-local-ranking-2026",
    excerpt: "From hyper-local intent to advanced schema markup, here is exactly how Nigerian businesses are dominating Google Search.",
    content: `<p>Ranking on Google in Nigeria requires a completely different strategy than it did three years ago. The introduction of highly localized, AI-driven search results means standard keyword stuffing will actively penalize your site.</p>
    <img src="/assets/blog/nigeria_seo_ranking.png" alt="SEO analysis in Nigeria" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Hyper-Local Intent</h2>
    <p>If you run a business in Ikeja, your SEO strategy must focus on Ikeja, not just Lagos. Implementing strict local schema markup and ensuring your Google Business Profile is heavily optimized with real, geotagged images is non-negotiable for 2026. Google's algorithm now heavily favors businesses that demonstrate genuine local presence through consistent NAP (Name, Address, Phone) data across all directories.</p>
    <h2>Technical SEO Foundations</h2>
    <p>Core Web Vitals remain the single most important technical ranking factor. Your site must achieve a Largest Contentful Paint under 2.5 seconds, a Cumulative Layout Shift below 0.1, and an Interaction to Next Paint under 200ms. For Nigerian sites serving users on varying network speeds, this means implementing aggressive image optimization, lazy loading, and efficient caching strategies. Using Next.js with its built-in image optimization component can automatically handle much of this.</p>
    <h2>Content Strategy for Nigerian Audiences</h2>
    <p>Long-form, authoritative content that addresses specific Nigerian pain points consistently outperforms generic international articles. Write about local challenges — power supply issues affecting e-commerce delivery, payment gateway integration for Naira transactions, or navigating NDPR compliance. Google rewards content that demonstrates genuine expertise and first-hand experience in the Nigerian market.</p>
    <h2>Building Authority Through Backlinks</h2>
    <p>Earning backlinks from respected Nigerian publications like TechCabal, Techpoint Africa, and Nairametrics carries significant weight for local rankings. Guest posting, contributing data-driven research, and building free tools that serve the Nigerian tech community are the most effective link-building strategies in 2026. Avoid purchasing links from generic directories — Google's spam detection for the Nigerian market has become extremely sophisticated.</p>`,
    tag: "SEO",
    published: true,
    featured_image: "/assets/blog/nigeria_seo_ranking.png",
    meta_title: "SEO in Nigeria: 2026 Local Ranking Guide | Johnnybits",
    meta_description: "Learn how to rank your Nigerian business on the first page of Google with advanced local SEO strategies for 2026.",
  },
  {
    title: "Building Scalable Real Estate Apps for the Nigerian Market",
    slug: "scalable-real-estate-apps-nigeria",
    excerpt: "Tackling the unique challenges of proptech in Nigeria through robust backend architecture and mobile-first design.",
    content: `<p>The Nigerian real estate sector (Proptech) is booming, but building the software to support it comes with immense challenges. From verifying properties to handling massive image uploads securely, the architecture must be flawless.</p>
    <img src="/assets/blog/nigerian_proptech_app.png" alt="Real estate app in Nigeria" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Handling High-Resolution Media Securely</h2>
    <p>We rely on scalable cloud buckets with CDN endpoints to ensure virtual tours and property images load instantly. Using modern image optimization libraries like next/image ensures users on varying data connections can still browse properties seamlessly. Each property listing in Nigeria typically requires 15-30 high-resolution images, plus floor plans and sometimes 360-degree virtual tours.</p>
    <h2>The Verification Challenge</h2>
    <p>Property fraud remains one of the biggest challenges in Nigerian real estate. A robust PropTech application must implement multi-layer verification: document uploads for C of O (Certificate of Occupancy), integration with state land registries where APIs are available, and mandatory agent verification through the Estate Surveyors and Valuers Registration Board of Nigeria (ESVARBON). Without these safeguards, your platform will lose user trust quickly.</p>
    <h2>Search and Discovery Architecture</h2>
    <p>Nigerian property searches are highly location-specific. Users search by estate names, local government areas, and even landmark proximity. Implementing a powerful search engine with geospatial indexing — using tools like PostgreSQL PostGIS or Elasticsearch — is essential. The search must handle Nigerian address formats, which are far less standardized than Western addresses, and support both formal addresses and colloquial location descriptions.</p>
    <h2>Payment and Escrow Integration</h2>
    <p>For platforms facilitating property transactions, integrating a secure escrow system is critical. We build custom escrow flows using Paystack or Flutterwave's subaccount infrastructure, where funds are held securely until both parties confirm the transaction. This protects both buyers and sellers in a market where trust remains the primary barrier to online property transactions.</p>`,
    tag: "App Development",
    published: true,
    featured_image: "/assets/blog/nigerian_proptech_app.png",
    meta_title: "Building Real Estate Apps in Nigeria | Johnnybits",
    meta_description: "Technical insights into building and scaling robust real estate applications (Proptech) for the Nigerian market.",
  },
  {
    title: "The Cost of Custom Software Development in Nigeria (2026)",
    slug: "cost-custom-software-development-nigeria",
    excerpt: "A transparent breakdown of pricing, timelines, and exactly what you are paying for when hiring a Nigerian tech agency.",
    content: `<p>One of the most common questions we get at Johnnybits is: "How much does it cost to build my app?" In 2026, the cost of software development in Nigeria has stabilized, reflecting the global standard of code quality produced by local talent.</p>
    <img src="/assets/blog/nigeria_software_cost.png" alt="Software development costs Nigeria" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Value vs Price</h2>
    <p>While you can find cheap freelancers, true enterprise software requires a team: UI/UX designers, frontend engineers, backend architects, and QA testers. Paying for a professional agency ensures your product is secure, scalable, and built to modern global standards. The cheapest option almost always becomes the most expensive when you factor in rewrites, security vulnerabilities, and lost time.</p>
    <h2>Typical Cost Ranges in Nigeria</h2>
    <p>A simple business website with 5-10 pages costs between ₦500,000 and ₦1,500,000. A custom web application with user authentication, dashboards, and payment integration ranges from ₦2,000,000 to ₦8,000,000. A full-featured mobile app (iOS and Android) with a backend API typically starts at ₦5,000,000 and can exceed ₦20,000,000 for complex platforms. These prices reflect the true cost of quality engineering, design, testing, and ongoing support.</p>
    <h2>What Drives the Cost Up?</h2>
    <p>Several factors significantly impact pricing: real-time features like live chat or notifications, third-party integrations (payment gateways, shipping APIs, SMS providers), complex user roles and permissions, and the need for admin dashboards. Custom design work — as opposed to template-based approaches — also adds cost but dramatically improves user engagement and brand perception.</p>
    <h2>How to Get the Best Value</h2>
    <p>Start with a Minimum Viable Product (MVP) that validates your core business hypothesis. We recommend building the essential features first, launching quickly, gathering real user feedback, and then iterating. This approach reduces upfront risk and ensures you are investing in features that your Nigerian audience actually wants and uses.</p>`,
    tag: "Technology",
    published: true,
    featured_image: "/assets/blog/nigeria_software_cost.png",
    meta_title: "Cost of Software Development in Nigeria | Johnnybits",
    meta_description: "A transparent guide to the cost of custom software and app development in Nigeria for businesses in 2026.",
  },
  {
    title: "Web Design Trends Captivating Nigerian Audiences",
    slug: "web-design-trends-nigeria-2026",
    excerpt: "Why dark mode, glassmorphism, and bold typography are dominating the digital landscape for African brands.",
    content: `<p>Design aesthetics in Nigeria have evolved rapidly. Brands are moving away from cluttered, bright websites toward sophisticated, premium experiences that rival top global companies.</p>
    <img src="/assets/blog/nigeria_web_design_trends.png" alt="Web design trends Nigeria" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>The Rise of Premium Aesthetics</h2>
    <p>We are seeing a massive shift toward dark mode interfaces, subtle micro-animations, and glassmorphism. These elements communicate trust, high value, and technological superiority to the Nigerian consumer. Premium design is no longer optional — it is the baseline expectation for any brand that wants to be taken seriously online.</p>
    <h2>Typography and Color Psychology</h2>
    <p>Nigerian audiences respond strongly to bold, confident typography. Modern sans-serif fonts like Inter, Outfit, and DM Sans dominate the landscape, replacing the dated serif fonts that characterized earlier Nigerian websites. Color palettes have shifted from the overly saturated primary colors of the past to sophisticated gradients and muted tones that create depth and elegance. Gold accents paired with deep navy or charcoal backgrounds have become particularly popular among Nigerian fintech and luxury brands.</p>
    <h2>Mobile-First is Non-Negotiable</h2>
    <p>Over 85% of Nigerian web traffic comes from mobile devices. Designing for desktop first and then adapting for mobile is a recipe for failure. Every interaction — from navigation menus to form inputs to image galleries — must be designed for thumb-friendly mobile use first. Responsive design is not enough; truly mobile-first design considers touch targets, scroll behavior, and data usage from the very first wireframe.</p>
    <h2>Animation and Interactivity</h2>
    <p>Subtle micro-animations — like hover effects, scroll-triggered reveals, and loading transitions — make a website feel alive and responsive. They guide user attention, provide feedback, and create memorable experiences. However, performance remains critical: animations must be GPU-accelerated and lightweight to avoid janky experiences on mid-range Android devices that dominate the Nigerian market.</p>`,
    tag: "Web Design",
    published: true,
    featured_image: "/assets/blog/nigeria_web_design_trends.png",
    meta_title: "2026 Web Design Trends in Nigeria | Johnnybits",
    meta_description: "Explore the modern web design trends like glassmorphism and dark mode that are elevating Nigerian brands in 2026.",
  },
  {
    title: "AI Integration for Nigerian SMEs: Where to Start",
    slug: "ai-integration-nigerian-smes",
    excerpt: "Practical ways small and medium businesses in Nigeria can leverage AI today to automate customer service and sales.",
    content: `<p>Artificial Intelligence isn't just for massive corporations. In 2026, accessible AI tools are the secret weapon for Nigerian SMEs looking to scale without exponentially increasing their headcount.</p>
    <img src="/assets/blog/nigeria_ai_sme_automation.png" alt="AI for Nigerian SMEs" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Automating Customer Support</h2>
    <p>By integrating customized LLMs (Large Language Models) trained on your specific business data into WhatsApp or your website, you can provide instant, 24/7, highly accurate customer support to thousands of clients simultaneously. A Lagos-based fashion retailer we worked with reduced their customer service response time from 4 hours to under 10 seconds after deploying an AI chatbot trained on their product catalog and return policies.</p>
    <h2>AI-Powered Sales and Lead Generation</h2>
    <p>AI tools can analyze customer behavior patterns to predict purchasing intent and automatically trigger personalized marketing messages. For Nigerian e-commerce businesses, this means sending targeted WhatsApp messages or emails at the exact moment a customer is most likely to convert. Tools like ChatGPT API, Claude, and Google's Gemini can be integrated into your existing CRM to generate personalized product recommendations based on browsing history and past purchases.</p>
    <h2>Inventory and Supply Chain Optimization</h2>
    <p>For SMEs dealing with physical products, AI-driven demand forecasting can dramatically reduce overstocking and stockouts. By analyzing historical sales data, seasonal trends, and even external factors like public holidays and fuel price changes, machine learning models can predict demand with remarkable accuracy. This is particularly valuable in Nigeria where supply chain disruptions are common and carrying excess inventory ties up precious working capital.</p>
    <h2>Getting Started Without Breaking the Bank</h2>
    <p>You don't need a massive budget to start with AI. Begin with pre-built APIs like OpenAI or Google's Vertex AI, which charge per usage rather than requiring upfront investment. A simple AI chatbot for WhatsApp Business can be built and deployed for under ₦200,000. The key is starting with one specific, high-impact use case rather than trying to AI-enable your entire operation at once.</p>`,
    tag: "Artificial Intelligence",
    published: true,
    featured_image: "/assets/blog/nigeria_ai_sme_automation.png",
    meta_title: "AI Integration for Nigerian SMEs | Johnnybits",
    meta_description: "How small and medium businesses in Nigeria can pragmatically integrate AI to automate operations and boost sales.",
  },
  {
    title: "Optimizing Web Apps for Unstable African Networks",
    slug: "optimizing-web-apps-unstable-networks-africa",
    excerpt: "Engineering strategies to ensure your Next.js and React applications remain perfectly usable even on dropping 3G connections.",
    content: `<p>Building for the African market requires acknowledging network reality. While 5G is spreading, a significant portion of users still experience intermittent connectivity drops. Your software must handle this gracefully.</p>
    <img src="/assets/portfolio/Incubation World.webp" alt="Network optimization in Africa" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Offline-First Architecture</h2>
    <p>By utilizing service workers, aggressive caching, and optimistic UI updates, we build web applications that don't freeze when the network drops. A user can continue filling out a form, and the app will silently sync with the server the moment connection is restored. This pattern is essential for any application targeting users outside major city centers where network coverage remains inconsistent.</p>
    <h2>Aggressive Image Optimization</h2>
    <p>Images are the single largest contributor to page weight. In Nigeria, where data costs remain high and speeds vary wildly, serving unoptimized images is unacceptable. We implement automatic format conversion to WebP and AVIF, responsive image loading based on device capability, lazy loading for below-the-fold content, and aggressive compression that maintains visual quality. A properly optimized Next.js application can reduce image payload by 70-80% without any visible quality loss.</p>
    <h2>Progressive Web App (PWA) Strategy</h2>
    <p>Converting your web application into a PWA allows users to install it on their home screen and access cached content even when completely offline. For Nigerian businesses, this means your application continues to function during the frequent network outages that affect different parts of the country. Push notifications keep users engaged, and the app-like experience eliminates the need to build separate native mobile applications — saving significant development costs.</p>
    <h2>Data-Conscious Design Patterns</h2>
    <p>Every API call, every image load, and every font file costs your Nigerian users real money in data charges. Implement data-saver modes that reduce image quality and disable auto-playing videos. Use system fonts as fallbacks to avoid loading custom font files. Batch API requests to reduce the number of network round trips. These seemingly small optimizations compound into a dramatically better experience for data-conscious users across Africa.</p>`,
    tag: "Software Development",
    published: true,
    featured_image: "/assets/portfolio/Incubation World.webp",
    meta_title: "Optimizing Web Apps for African Networks | Johnnybits",
    meta_description: "Learn offline-first engineering strategies to make web applications resilient and fast on African network connections.",
  },
  {
    title: "Why WordPress is Still Relevant for Nigerian Blogs in 2026",
    slug: "wordpress-still-relevant-nigeria-2026",
    excerpt: "Despite the rise of headless CMS, here's why WordPress remains an absolute powerhouse for content-heavy African sites.",
    content: `<p>With frameworks like Next.js dominating the conversation, it's easy to think WordPress is dead. However, for Nigerian media outlets and massive content blogs, WordPress in 2026 is stronger than ever.</p>
    <img src="/assets/portfolio/German-African Initiative for Development and Integration – (GAIDI) UG. WordPress Web Design.webp" alt="WordPress in Nigeria" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Headless WordPress: The Best of Both Worlds</h2>
    <p>The modern approach isn't abandoning WordPress; it's going headless. We use WordPress purely as a powerful backend for editors, while serving the actual website via a lightning-fast React or Next.js frontend. This delivers uncompromised SEO and editorial experience while achieving the performance scores that Google demands for top rankings in the Nigerian search market.</p>
    <h2>The Content Editor Advantage</h2>
    <p>No custom CMS can match the maturity of WordPress's content editing experience. The Gutenberg block editor, combined with thousands of specialized plugins for SEO (Yoast, RankMath), multilingual content, and editorial workflows, gives content teams superpowers. For Nigerian media companies publishing dozens of articles daily, this editorial efficiency is invaluable and impossible to replicate cost-effectively with a custom solution.</p>
    <h2>Plugin Ecosystem and Cost Efficiency</h2>
    <p>WordPress's plugin ecosystem means you can add complex functionality — email marketing integration, social media scheduling, advanced analytics, membership systems — without custom development. For budget-conscious Nigerian businesses, this can save millions of Naira in development costs. The key is choosing well-maintained, reputable plugins and keeping them updated to avoid security vulnerabilities.</p>
    <h2>When NOT to Use WordPress</h2>
    <p>WordPress is not the right choice for every project. Custom web applications with complex user interactions, real-time features, or sophisticated business logic should be built with modern frameworks like Next.js or Remix. E-commerce platforms with complex inventory management are better served by dedicated solutions. The sweet spot for WordPress remains content-heavy sites: blogs, news portals, corporate websites, and portfolio sites where the content editing experience matters most.</p>`,
    tag: "Web Design",
    published: true,
    featured_image: "/assets/portfolio/German-African Initiative for Development and Integration – (GAIDI) UG. WordPress Web Design.webp",
    meta_title: "Is WordPress Still Relevant in Nigeria? | Johnnybits",
    meta_description: "Why Headless WordPress is the ultimate solution for high-traffic media and blog sites in Nigeria in 2026.",
  },
  {
    title: "The Impact of Data Privacy Laws (NDPR) on Software Dev",
    slug: "ndpr-data-privacy-software-development-nigeria",
    excerpt: "How the Nigeria Data Protection Regulation is shaping the way backend architects structure databases and handle user data.",
    content: `<p>Compliance is no longer an afterthought. The enforcement of NDPR has forced software developers in Nigeria to fundamentally rethink how data is collected, encrypted, and stored.</p>
    <img src="/assets/portfolio/Unlock Possibilities and Start Earning with Affiliate Marketing Today Credify.webp" alt="Data privacy in Nigeria" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Privacy by Design</h2>
    <p>In 2026, we implement 'Privacy by Design'. This means databases are structured to anonymize PII (Personally Identifiable Information) by default, and robust audit logs are built into the architecture from day one to ensure full regulatory compliance. Every new feature is assessed for data privacy implications before a single line of code is written.</p>
    <h2>What NDPR Requires from Developers</h2>
    <p>The Nigeria Data Protection Regulation mandates explicit user consent before collecting personal data, the right to data portability and deletion, mandatory data breach notification within 72 hours, and the appointment of a Data Protection Officer for organizations processing large volumes of personal data. For software developers, this translates into specific technical requirements: consent management systems, data export APIs, automated breach detection, and comprehensive audit logging.</p>
    <h2>Database Architecture for Compliance</h2>
    <p>We structure databases with privacy in mind from the start. Personal data is separated into dedicated tables with encryption at rest. Access is controlled through role-based permissions with full audit trails. Data retention policies are enforced automatically — personal data that has exceeded its retention period is purged or anonymized without manual intervention. This architectural approach makes compliance audits straightforward and reduces the risk of accidental data exposure.</p>
    <h2>The Business Case for Compliance</h2>
    <p>Beyond avoiding penalties (which can reach 2% of annual revenue or ₦10 million, whichever is higher), NDPR compliance has become a competitive advantage. Nigerian consumers are increasingly privacy-conscious, and businesses that demonstrate robust data protection practices earn greater trust. International clients and partners increasingly require proof of data protection compliance before engaging with Nigerian tech companies, making NDPR adherence essential for companies looking to scale beyond the domestic market.</p>`,
    tag: "Technology",
    published: true,
    featured_image: "/assets/portfolio/Unlock Possibilities and Start Earning with Affiliate Marketing Today Credify.webp",
    meta_title: "NDPR and Software Development in Nigeria | Johnnybits",
    meta_description: "How Nigerian data privacy laws (NDPR) are dictating modern database architecture and software security standards.",
  }
];

async function seed() {
  try {
    console.log("Connected to database. Clearing old blog posts...");
    await sql`TRUNCATE TABLE blog_posts RESTART IDENTITY CASCADE`;

    console.log("Seeding 10 highly localized Nigerian SEO blog posts...");
    for (const post of POSTS) {
      await sql`
        INSERT INTO blog_posts (title, slug, excerpt, content, tag, published, meta_title, meta_description, featured_image, created_at)
        VALUES (${post.title}, ${post.slug}, ${post.excerpt}, ${post.content}, ${post.tag}, ${post.published}, ${post.meta_title}, ${post.meta_description}, ${post.featured_image}, NOW() - (random() * interval '60 days'))
      `;
      console.log(`Inserted: ${post.title}`);
    }

    console.log("Successfully seeded localized blog posts with featured images!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding blog posts:", error);
    process.exit(1);
  }
}

seed();
