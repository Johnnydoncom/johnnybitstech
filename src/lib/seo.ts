import { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/config/site";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  noIndex?: boolean;
}

export function constructMetadata({
  title,
  description,
  image = "/og-image.png",
  noIndex = false,
}: SEOProps): Metadata {
  return {
    title,
    description,
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
