import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SITE_URL, SITE_NAME } from '@/config/site';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#111827',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Digital Solutions`,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Johnnybits Technology is a premium digital agency specializing in web design, development, and digital marketing solutions.",
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    description: "Johnnybits Technology is a premium digital agency specializing in web design, development, and digital marketing solutions.",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Digital Solutions`,
    images: [
      {
        url: '/og-image.png', // Add this image to your public folder
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Logo`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Digital Solutions`,
    description: "Johnnybits Technology is a premium digital agency specializing in web design, development, and digital marketing solutions.",
    images: ['/og-image.png'], // Add this image to your public folder
  },
  alternates: {
    canonical: SITE_URL,
  },
  keywords: [
    "Johnnybits Technology",
    "web design Nigeria",
    "digital agency Lagos",
    "web development",
    "SEO services",
    "digital marketing",
    "Web Designers in Ibadan",
    "Web Design Ibadan",
    "Affordable Web Design Nigeria",
    "Web Development Nigeria",
    "SEO Company in Ibadan",
    "Digital Marketing Agency in Nigeria",
    "Professional Website Design Nigeria",
    "E-Commerce Development Nigeria",
    "Online Store Nigeria",
    "Best Web Designers Nigeria",
    "Grow Your Business Online"
  ]
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col w-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  "name": SITE_NAME,
                  "url": SITE_URL,
                  "logo": {
                    "@type": "ImageObject",
                    "url": `${SITE_URL}/og-image.png`
                  },
                  "description": "Premium digital agency specializing in web design, development, and digital marketing solutions."
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  "url": SITE_URL,
                  "name": SITE_NAME,
                  "publisher": {
                    "@id": `${SITE_URL}/#organization`
                  }
                }
              ]
            })
          }}
        />
        <Providers>
          <Suspense fallback={<div className="flex-1 bg-background w-full" />}>
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}

