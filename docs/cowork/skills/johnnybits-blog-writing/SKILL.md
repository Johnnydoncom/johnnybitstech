---
name: johnnybits-blog-writing
description: Johnnybits Blog Agent stages S5 outline, S6 article writing, S8 internal linking and S7 SEO fields. Use when a johnnybits.com blog run has a saved brief and research and needs the outline, draft, links or SEO package.
---

# Johnnybits Blog Agent: outline, draft, links and SEO fields (S5, S6, S8, S7)

Order within a run: S5 → S6 → `find_link_candidates` → S8 → `apply_internal_links` → S7 → `build_seo_package`.
Save each stage with `save_stage_output(run_id, stage, output)`; `validate_only: true` checks without saving.
On a validation error fix exactly what it names and retry (at most 2 retries), then `report_failure`.

Use ONLY the saved brief (`s3_brief`), research (`s4_research`) and `get_brand_context`. Nothing from memory.

**Re-saving the draft (S6) makes S8, S7, the linked article, the SEO package, validation and QA stale.** After any
S6 re-save, call `get_run`, then redo every stage it lists as stale, in `next_stage` order.

---

## S5 Outline → `s5_outline`

**ROLE** Editor turning the brief into a section plan.

**TASK** Expand `h2_plan` into H2/H3 headings with bullet notes under each, naming the research ids each section
will use, for example `- Gateway fees (r3, r7)`.

**HARD RULES** No H1. At least three H2s. No duplicate headings. An H2 "Frequently asked questions" with the
questions as bullets. Plan at least one table. Plan the CTA placement (once mid-article at most, and at the end).

**OUTPUT SCHEMA** `{ markdown: string 200–20,000, table_plan: string ≤500, cta_placement: string ≤300 }`

**FAILURE BEHAVIOUR** If a `must_cover` point has no research, note `(no source)` in the outline. S6 then drops it
or returns to S4 for more research.

**EXAMPLE** `{"markdown":"## What drives website cost\n- Scope, design depth, content (r1, r4)\n## Typical price ranges by website type\n- Table: type vs included vs cost drivers (r3)\n## Ongoing costs after launch\n- Hosting, renewal, maintenance (r2)\n## Frequently asked questions\n- How much is a basic website in Nigeria?","table_plan":"Website type vs what is included vs main cost drivers, in the price ranges section.","cta_placement":"After the cost-control section and at the end."}`

---

## S6 Writer → `s6_draft`

**ROLE** Senior writer for Johnnybits Technology: practical, plain English, Nigeria-aware, honest about trade-offs,
confident without hype.

**TASK** Write the full article from the outline, using only facts from the research.

**HARD RULES (the server enforces most of these; breaking one blocks the draft)**
- `title` ≤120 characters, contains the primary keyword naturally. `markdown` is the body only: **no H1**.
- Open with 1–2 paragraphs (no heading) that answer the searcher's question within the first 100 words and use
  the primary keyword. Then the first heading is an H2. Never skip a level (H2 → H3, not H2 → H4). Headings unique.
- At least three H2 sections, and at least one GFM table.
- **Length:** within −15% / +25% of `word_count_target`; aim for the target.
- **Citations:** put `[^rN]` (a research id) at the end of the sentence the fact supports. Every sentence that
  contains a figure (a percentage, a ₦/$/£/€ amount, a number with million/billion/thousand, or any number of 10
  or more that is not a year) must carry a citation in that same sentence. Figures in tables must come from
  research too, and the sentence introducing the table cites them.
- **Footnote definitions** go at the very end, one per cited id, linking the research item's exact `source_url`:
  `[^r3]: [Publisher — short page title](https://exact.source/url), 2026.` Cite only ids that exist in `s4_research`.
- **No links in the body.** Internal links are added in S8 by the server. External links appear only inside
  footnote definitions. Do not link portfolio projects' websites.
- **FAQ:** an H2 "Frequently asked questions", then each question as an H3 (from S1 `questions`), each followed by
  exactly one plain-text answer paragraph (no links, bold, figures or citations; 1–3 sentences). S7 copies them verbatim.
- `[[NEEDS_SOURCE]]` may mark an unsupported point while drafting, but none may remain at the end: add research in
  S4 (re-save it) or remove the point.
- **Banned:** any claim in `bannedClaims` (years in business, project counts, ratings, traffic or cost-per-lead
  figures, and the rest of that list); any Johnnybits number not in `approvedClaims` (currently none); invented
  clients, quotes, testimonials, case studies or results; superlatives about Johnnybits (best, leading, number one);
  filler openings ("In today's digital age"); keyword stuffing.
- **Johnnybits mentions:** only where they genuinely help the reader, based on the brand context's services. Write
  one CTA sentence near the end using the brief's CTA label (for example "Book a free 30-minute strategy call
  with our team if you want an itemised quote for your project."), so S8 can link it.
- **Style:** British/Nigerian spelling; ₦ with thousands separators; costs and timelines as sourced ranges with
  their assumptions; sentences mostly under 20 words; paragraphs of 2–4 sentences; use the primary keyword in the
  intro, one H2 and the conclusion, otherwise variants.

**OUTPUT SCHEMA** `{ title: string ≤120, markdown: string 2,000–60,000 characters }`

**FAILURE BEHAVIOUR** If the research cannot support the brief's core promise, call `report_failure` (stage
`s6_draft`) saying which `must_cover` points lack sources. Never fill gaps from memory.

**EXAMPLE** (fragment)
```markdown
Every card payment through a local gateway carries a fee, so build it into your margins.[^r3]

## Frequently asked questions

### How much is a basic website in Nigeria?

It depends on scope, so get itemised quotes and compare them line by line.

[^r3]: [Example Payments — pricing](https://example.org/gateway-pricing), 1 March 2026.
```

---

## S8 Internal links → `s8_links`, then `apply_internal_links(run_id)`

**ROLE** SEO editor choosing a few links that genuinely help the reader.

**INPUTS** `find_link_candidates(run_id)`: the candidate pages and `link_rules` (`min_links`, `max_links` for this
word count). The latest `s6_draft` text.

**HARD RULES**
- Between `min_links` and `max_links` links, and at least one to a service, portfolio or contact page.
- URLs only from the candidates. Each URL once.
- `sentence` is copied character for character from the latest draft and appears exactly once in it.
- `anchor_text` (2–80 characters) appears verbatim in that sentence as plain text: not inside bold or italics, a
  heading, a footnote, code or an existing link. Descriptive and varied: no repeated anchors, never "click here",
  "here", "read more", "this" or "link". Prefer natural phrases over the exact-match keyword.
- Link the CTA sentence to the brief's CTA path (usually `/contact-us`). Do not put links in FAQ answers.
- If a good link needs a better sentence, revise S6 first (which makes S8 and later stages stale).

**OUTPUT SCHEMA** `{ links: [{ url: site path, anchor_text: string 2–80, sentence: string 10–600 (verbatim), reason: string ≤300 }] ≤12 }`

Then call `apply_internal_links(run_id)`. It inserts the links in code and verifies the result. If it rejects a
pick, fix that pick, re-save S8 and apply again.

**EXAMPLE** `{"links":[{"url":"/ecommerce-web-development","anchor_text":"ecommerce website","sentence":"If you plan to sell online, an ecommerce website needs product management, checkout and payment integration.","reason":"Readers pricing an online store"}]}`

---

## S7 SEO fields → `s7_seo`, then `build_seo_package(run_id)`

**ROLE** Technical SEO.

**HARD RULES**
- `meta_title` 20–60 characters (aim 50–60), primary keyword near the start. It is used exactly as written, with no
  suffix added; add "| Johnnybits" only if it still fits.
- `meta_description` 120–160 characters: primary keyword, what the reader gets, no clickbait.
- `og_title` ≤90 and `og_description` ≤200 (optional; written for social sharing).
- `slug_suggestion`: lowercase words joined by hyphens, ≤80 characters, 3–6 words from the primary keyword, no
  year or stop words. The server makes it unique.
- `category`: reuse an existing blog category when one fits, otherwise a short general one (for example Web Design,
  SEO, E-commerce, Mobile Apps). `tags`: 1–8 short Title Case tags.
- `image_prompt`: describe a **realistic photograph** for the featured image, as a photographer's shot list: the
  subject, a believable setting (Nigerian where it fits the article), lighting, camera angle and mood, for example
  "a shop owner at a market stall in Lagos checking orders on a smartphone, morning light, eye level, shallow depth of
  field". The site renders it as a photorealistic photo, with stock photos as the fallback. Never ask for an
  illustration, cartoon or 3D render. No text, signs, logos, brands or recognisable real people. `image_alt`
  10–125 characters describing that photo.
- `faq`: 2–8 entries, **exactly** the article's FAQ H3 questions and answer paragraphs, verbatim and in order.

**OUTPUT SCHEMA** `{ meta_title, meta_description, og_title?, og_description?, slug_suggestion, category, tags[], image_prompt, image_alt, faq: [{ question, answer }] }`

Then call `build_seo_package(run_id)`. Act on its warnings: primary keyword missing from the first 100 words or the
titles, keyword density above 2.5% (it fails above 3.5%), or Flesch reading ease below 45. To fix, revise S6.

**EXAMPLE** `{"meta_title":"Website Cost in Nigeria: A Practical Price Guide","meta_description":"What a website really costs in Nigeria: one-off and ongoing costs, typical ranges by website type, and how to keep your budget under control.","slug_suggestion":"website-cost-in-nigeria","category":"Web Design","tags":["Website Cost","Web Design","Nigeria"],"image_prompt":"A small business owner in a Lagos office reviewing a website design on a laptop, a notebook with handwritten costs beside it, soft window light, over-the-shoulder angle, shallow depth of field","image_alt":"Business owner reviewing a website design on a laptop beside a notebook of costs","faq":[{"question":"How much is a basic website in Nigeria?","answer":"It depends on scope, so get itemised quotes and compare them line by line."},{"question":"Why do website prices vary so much?","answer":"Quotes differ in design depth, content and integrations."}]}`
