import { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/config/site";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  noIndex?: boolean;
  absoluteTitle?: boolean;
  keywords?: string[];
  canonicalUrl?: string;
}

export function constructMetadata({
  title,
  description,
  image = "/assets/johnnybits-logo.png",
  noIndex = false,
  absoluteTitle = false,
  keywords,
  canonicalUrl,
}: SEOProps): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - ${title}`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
