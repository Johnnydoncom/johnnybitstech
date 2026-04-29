import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Contact Us | Johnnybits Technology",
  description: "Get in touch with Johnnybits Technology for web design, development, and digital marketing inquiries. We typically reply within one business day.",
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
            "name": "Contact Us | Johnnybits Technology",
            "description": "Get in touch with Johnnybits Technology for web design, development, and digital marketing inquiries. We typically reply within one business day.",
            "url": "https://johnnybits.com/contact"
          })
        }}
      />
      {children}
    </>
  );
}
