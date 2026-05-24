import { constructMetadata } from "@/lib/seo";
import { SEPARATOR, SITE_NAME, SITE_URL } from "@/config/site";

const SEO_TITLE = "Contact Us" + SEPARATOR + "Web Design Company in Ibadan, Nigeria" + SEPARATOR + SITE_NAME;
const SEO_DESCRIPTION = "Get in touch with Johnnybits Technology for web design, development, and digital marketing inquiries. We typically reply within one business day. Tel: 08031304346.";

export const metadata = constructMetadata({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  keywords: ["contact", "web design", "development", "digital marketing", "Ibadan", "Nigeria", "08031304346", SITE_NAME],
  canonicalUrl: "/contact-us",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": SEO_TITLE,
            "description": SEO_DESCRIPTION,
            "url": `${SITE_URL}/contact-us`
          })
        }}
      />
      {children}
    </>
  );
}
