import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

/** /robots.txt: everything public may be crawled; points crawlers at the sitemap. */
export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/oauth/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
