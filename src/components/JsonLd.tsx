/**
 * Reusable JSON-LD structured data component.
 *
 * Renders a `<script type="application/ld+json">` tag following Next.js
 * App Router best practices (see node_modules/next/dist/docs/01-app/02-guides/json-ld.md).
 *
 * Usage:
 *   <JsonLd data={{ "@context": "https://schema.org", ... }} />
 *
 * The component sanitises the output to prevent XSS via embedded HTML tags.
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
