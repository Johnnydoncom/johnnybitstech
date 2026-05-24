import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Our Work | Johnnybits Technology",
  description: "Explore our portfolio of recent projects spanning web design, development, ecommerce, and digital marketing across Nigeria and beyond.",
});

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Our Work | Johnnybits Technology",
            "description": "Explore our portfolio of recent projects spanning web design, development, ecommerce, and digital marketing across Nigeria and beyond.",
            "url": "https://johnnybits.com/portfolio"
          })
        }}
      />
      {children}
    </>
  );
}
