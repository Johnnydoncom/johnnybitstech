const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const POSTS = [
  {
    title: "The Best E-commerce Payment Gateways in Nigeria for 2026",
    slug: "best-ecommerce-payment-gateways-nigeria-2026",
    excerpt: "Comparing Paystack, Flutterwave, and Monnify for speed, reliability, and developer experience in the Nigerian market.",
    content: `<p>If you're building an e-commerce platform in Nigeria in 2026, choosing the right payment gateway is the most critical technical decision you will make. With the rise of sophisticated mobile commerce, customers in Lagos, Abuja, and Port Harcourt expect zero friction when checking out.</p>
    <img src="/assets/blog/ecommerce_payment_nigeria.png" alt="Nigerian woman using e-commerce payment app" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Paystack vs Flutterwave vs Monnify</h2>
    <p>While Paystack remains the developer darling for its incredibly clean API and webhook reliability, Flutterwave's multi-currency support makes it indispensable for Nigerian startups looking to expand across Africa. Monnify, backed by Moniepoint, has rapidly gained market share for its rock-solid virtual account infrastructure, which is highly preferred by B2B businesses.</p>`,
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
    <p>By leveraging Serverless architecture and Edge rendering, companies are serving applications from nodes closer to the user. This means a user in Yaba connecting via a 4G network experiences near-instant load times. Next.js App Router and Server Components have fundamentally changed how we build for the African web.</p>`,
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
    <p>If you run a business in Ikeja, your SEO strategy must focus on Ikeja, not just Lagos. Implementing strict local schema markup and ensuring your Google Business Profile is heavily optimized with real, geotagged images is non-negotiable for 2026.</p>`,
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
    <p>We rely on scalable cloud buckets with CDN endpoints to ensure virtual tours and property images load instantly. Using modern image optimization libraries like next/image ensures users on varying data connections can still browse properties seamlessly.</p>`,
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
    <p>While you can find cheap freelancers, true enterprise software requires a team: UI/UX designers, frontend engineers, backend architects, and QA testers. Paying for a professional agency ensures your product is secure, scalable, and built to modern global standards.</p>`,
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
    <p>We're seeing a massive shift toward dark mode interfaces, subtle micro-animations, and glassmorphism. These elements communicate trust, high value, and technological superiority to the Nigerian consumer.</p>`,
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
    <p>By integrating customized LLMs (Large Language Models) trained on your specific business data into WhatsApp or your website, you can provide instant, 24/7, highly accurate customer support to thousands of clients simultaneously.</p>`,
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
    <img src="https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80&w=800" alt="Network optimization in Africa" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Offline-First Architecture</h2>
    <p>By utilizing service workers, aggressive caching, and optimistic UI updates, we build web applications that don't freeze when the network drops. A user can continue filling out a form, and the app will silently sync with the server the moment connection is restored.</p>`,
    tag: "Software Development",
    published: true,
    featured_image: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80&w=800",
    meta_title: "Optimizing Web Apps for African Networks | Johnnybits",
    meta_description: "Learn offline-first engineering strategies to make web applications resilient and fast on African network connections.",
  },
  {
    title: "Why WordPress is Still Relevant for Nigerian Blogs in 2026",
    slug: "wordpress-still-relevant-nigeria-2026",
    excerpt: "Despite the rise of headless CMS, here's why WordPress remains an absolute powerhouse for content-heavy African sites.",
    content: `<p>With frameworks like Next.js dominating the conversation, it's easy to think WordPress is dead. However, for Nigerian media outlets and massive content blogs, WordPress in 2026 is stronger than ever.</p>
    <img src="https://images.unsplash.com/photo-1541462608141-ad6034e6284a?auto=format&fit=crop&q=80&w=800" alt="WordPress in Nigeria" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Headless WordPress: The Best of Both Worlds</h2>
    <p>The modern approach isn't abandoning WordPress; it's going headless. We use WordPress purely as a powerful backend for editors, while serving the actual website via a lightning-fast React frontend. This delivers uncompromised SEO and editorial experience.</p>`,
    tag: "Web Design",
    published: true,
    featured_image: "https://images.unsplash.com/photo-1541462608141-ad6034e6284a?auto=format&fit=crop&q=80&w=800",
    meta_title: "Is WordPress Still Relevant in Nigeria? | Johnnybits",
    meta_description: "Why Headless WordPress is the ultimate solution for high-traffic media and blog sites in Nigeria in 2026.",
  },
  {
    title: "The Impact of Data Privacy Laws (NDPR) on Software Dev",
    slug: "ndpr-data-privacy-software-development-nigeria",
    excerpt: "How the Nigeria Data Protection Regulation is shaping the way backend architects structure databases and handle user data.",
    content: `<p>Compliance is no longer an afterthought. The enforcement of NDPR has forced software developers in Nigeria to fundamentally rethink how data is collected, encrypted, and stored.</p>
    <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800" alt="Data privacy in Nigeria" style="border-radius: 12px; margin: 24px 0; width: 100%;" />
    <h2>Privacy by Design</h2>
    <p>In 2026, we implement 'Privacy by Design'. This means databases are structured to anonymize PII (Personally Identifiable Information) by default, and robust audit logs are built into the architecture from day one to ensure full regulatory compliance.</p>`,
    tag: "Technology",
    published: true,
    featured_image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800",
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
