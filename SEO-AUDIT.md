# MedCasts SEO & Content Audit

**Date:** 2026-04-30
**Scope:** 80+ public Astro pages across 8 locales. Admin (Next.js) excluded — no SEO value.
**Method:** 5 parallel auditors checked title/meta, H1/headings, JSON-LD, canonical/hreflang, internal linking, image alt, content depth, E-E-A-T (YMYL), noindex correctness, form a11y.

---

## TL;DR — Overall Posture

**Strong fundamentals, several bugs, and consistent gaps in YMYL trust signals.**

Shared infra (`HeadMeta.astro`, `seo.ts`, `BaseLayout.astro`) is excellent: hreflang for 8 locales + x-default, dynamic OG image generation, 13+ JSON-LD factory functions, `withProvenance()` for `dateModified` + `reviewedBy`, multi-tier sitemaps, AI-friendly `robots.txt` and `llms.txt`. Listing pages use a smart canonical strategy (country-only filters self-canonicalise, deeper filters + page > 1 noindex).

But three classes of issues recur:

1. **Live bugs that will throw or produce broken markup** — 3 fixes block correctness.
2. **YMYL/E-E-A-T thinness** — for a medical-travel site, reviewer profiles aren't linked, citations are absent from blog/glossary, "last medically reviewed" dates aren't surfaced consistently.
3. **Programmatic-SEO duplication risk** in the `treatment × country × city × cost` URL space — no canonicals, no thin-page noindex.

Fix the 6 CRITICAL items first; they're cheap and unblock indexing.

---

## Severity Legend

| | Meaning |
|---|---|
| 🔴 CRITICAL | Bug, broken markup, or hard SEO blocker. Fix this sprint. |
| 🟠 HIGH | Material ranking/indexation impact. Fix within ~2 sprints. |
| 🟡 MEDIUM | Quality/E-E-A-T improvement. Backlog. |
| 🟢 LOW | Polish. |

---

## 1. CRITICAL — Fix immediately

### 1.1 🔴 `astro/src/pages/sitemap-hospitals.xml.ts:11` — missing `eq` import
`eq(hospitals.isActive, true)` is called but `eq` is not in the drizzle-orm destructure on line 4. Sitemap will 500 on generation, blocking Google from discovering hospital URLs.
**Fix:** add `eq` to the import: `import { desc, and, isNotNull, eq } from "drizzle-orm";`

### 1.2 🔴 `astro/src/pages/[locale]/best/index.astro:71` — undefined `crumbs` variable
Line 71 emits `<script ... set:html={JSON.stringify(crumbs)} />` but `crumbs` is never declared in the frontmatter. Build/runtime error.
**Fix:** add `const crumbs = breadcrumbJsonLd([{name: "Home", url: ...}, {name: "Best", url: ...}]);` before the `<Fragment slot="head">`.

### 1.3 🔴 `astro/src/pages/[locale]/treatment/[slug]/[city].astro:142` — malformed `treatmentJsonLd` call
`treatmentJsonLd(treatment, path)` is called with two positional args, but the function signature in `seo.ts:235` accepts a single object. Schema either throws or emits `undefined` fields.
**Fix:** `treatmentJsonLd({ name: treatment.name, description: ..., costMinUsd: ..., url: localeUrl(locale, path), ... })`.

### 1.4 🔴 Missing semantic `<h1>` on 4 high-traffic pages
- `compare/hospitals.astro:138` — styled heading, no `<h1>`
- `compare/doctors.astro:128` — same
- `emergency/index.astro:129` — same
- `second-opinion/index.astro:96` — h1 may not render based on locale strings
**Impact:** primary on-page topic signal missing. Google will guess.
**Fix:** wrap each headline in `<h1>...</h1>`.

### 1.5 🔴 `astro/src/pages/[locale]/qa/index.astro` — no QAPage/FAQ schema on listing
Only breadcrumbs are emitted. The page is a curated Q&A index — exactly the case for `FAQPage` (or `CollectionPage` with `QAPage` items).
**Fix:** call `faqJsonLd(visibleQs)` over the items rendered above the fold.

### 1.6 🔴 `astro/src/pages/[locale]/glossary/index.astro:48-53` — hardcoded fake FAQ schema
The schema contains example/placeholder Q&A that don't match what's on the page. Google treats this as schema spam.
**Fix:** either remove the FAQ schema, or pull real glossary FAQs from DB.

---

## 2. HIGH — Address within 2 sprints

### 2.1 🟠 Programmatic-SEO cannibalisation: treatment × country × city × cost
The URL space has four overlapping templates targeting "treatment cost" intent:

| URL | Purpose | Risk |
|---|---|---|
| `/treatment/[slug]` | Overview + price sidebar | Authority page |
| `/treatment/[slug]/[country]` | Cost in country | No canonical, no withProvenance, no thin-page noindex |
| `/treatment/[slug]/[city]` | Cost in city | No canonical, no FAQ, schema is broken (1.3) |
| `/cost/[slug]` | Cost-comparison hub | Strong content, overlaps with `/treatment/[slug]` |

`/treatment/[slug]` and `/cost/[slug]` both rank for the same head term ("treatment cost"). `/treatment/[slug]/[country]` and `/cost/[slug]` both rank for "treatment cost in {country}".

**Fix (pick one, document it):**
- **A. Canonical consolidation** — `/treatment/[slug]/[country]` and `/treatment/[slug]/[city]` set canonical → `/treatment/[slug]`. Keep them indexable for users but funnel link equity.
- **B. Differentiation by intent** — `/cost/[slug]` keeps cost-keyword canonicals, `/treatment/[slug]` is overview-canonical, sub-routes are noindex. Add explicit `rel="related"` between them.
- Either way: empty pairs (no hospitals offering the treatment in that country) **must be noindex**. Currently `/treatment/[slug]/[country]` shows an empty state (line 302) but doesn't set `noindex`.

### 2.2 🟠 `withProvenance()` missing on treatment×country schema
`treatment/[slug]/[country].astro:127–135` emits `treatmentJsonLd` directly with no `dateModified` or reviewer. Cost-bearing pages are exactly where E-E-A-T matters most.
**Fix:** wrap with `withProvenance(treatmentJsonLd({...}), { dateModified: new Date(), reviewer })`.

### 2.3 🟠 Thin-content pages aren't noindex'd
Defensive noindex is missing in several places:
- `hospital/[slug].astro:213` — only checks `untranslated`, not `!hospital.description`
- `hospital/[slug]/[specialty]/index.astro:165` — doesn't check `treatments.length === 0`
- `doctor/[slug].astro:193` — doesn't check `!doctor.bio`
- `condition/[slug]/doctors.astro:76` — doesn't check `doctors.length === 0`
- `treatments/country/[countrySlug].astro` — empty country (zero priced treatments) not noindex'd
- `accreditation/[code].astro` — accreditations with 0 hospitals stay indexed
- `surgeons/[specialty]/[country].astro` — empty rollups don't 404

**Fix:** expand each `noindex` prop to OR with the thin-content condition.

### 2.4 🟠 Missing entity schema on roster/listing pages scoped to a parent entity
- `hospital/[slug]/[specialty]/doctors.astro` only emits `itemListJsonLd` — should also emit `hospitalJsonLd` since the page is hospital-scoped.
- `condition/[slug]/doctors.astro` only emits `itemListJsonLd` — should also emit `medicalConditionJsonLd`.
- `medical-tourism-companies/[slug].astro` has no `Organization` schema for the company profile.

### 2.5 🟠 Reviewer credibility not surfaced
The schema embeds `reviewedBy` correctly via `withProvenance`, but in the UI:
- Blog reviewer name is plain text, no link to a `/medical-board/[slug]` profile
- Q&A `reviewed_by` is plain text
- Glossary, best/[slug], surgeons rollups have no reviewer byline at all

For YMYL/medical content this is a Google E-E-A-T risk.
**Fix:** link every visible reviewer name to `/medical-board#{slug}` (route already exists), and surface reviewer + last-reviewed date as a visible byline.

### 2.6 🟠 No outbound citations on YMYL content
Blog posts, glossary terms, and condition descriptions cite zero authoritative sources (NIH, WHO, peer-reviewed journals, government health authorities). For a medical-travel site this is the single biggest E-E-A-T gap.
**Fix:** editorial pass to add 3–5 authoritative outbound links per ~1,000 words on `blog/[slug]`, `glossary/[term]`, `condition/[slug]`.

### 2.7 🟠 YMYL disclaimers missing on emergency / triage / second-opinion
- `emergency/index.astro` — no "for life-threatening events call 911 / 112 / local services" disclaimer
- `emergency-triage/index.astro` — no "informational only, not medical advice" disclaimer
- `second-opinion/index.astro` — no "not a substitute for in-person evaluation" disclaimer

These are explicit Google YMYL signals and also liability protection.

### 2.8 🟠 Form accessibility — missing `<label>`/`aria-label` on 5 pages
`quote/index.astro`, `find-specialist/index.astro`, `referral/index.astro`, `contact/index.astro`, `incident-report/index.astro`, `portal/index.astro` — fields use styled `<span>` rather than `<label for=...>`. WCAG 2.1 Level A failure; also affects how Lighthouse SEO scores the form.
**Fix:** wrap every input in `<label for="id">` or add `aria-label`.

### 2.9 🟠 Missing `ContactPage` schema on contact-form pages
`quote`, `find-specialist`, `referral`, `contact`, `portal/index` — all have inquiry forms but no `ContactPage`/`contactPoint` schema.

### 2.10 🟠 Missing breadcrumb schema on portal subpages
`portal/[code].astro`, `portal/[code]/followup.astro`, `portal/[code]/medications.astro`, `portal/[code]/recovery.astro`, `journey/[code].astro` — no `BreadcrumbList`. (Pages are `noindex`d anyway, so SEO impact is small, but breadcrumbs improve crawl-budget attribution if they ever leak.)

### 2.11 🟠 `robots.txt` declares 11 sitemaps; sitemap index has 22
`robots.txt.ts` is missing 5 sitemaps that exist and are referenced from `sitemap.xml.ts`: `sitemap-treatments-countries`, `sitemap-treatments-cities`, `sitemap-best`, `sitemap-qa`, `sitemap-glossary`.
**Fix:** add all 22 to robots.txt; or, if some are intentionally hidden, document why.

### 2.12 🟠 Hero image missing alt on `country/[slug]:181`
`alt=""` on the hero banner. Should be `alt="Medical travel to {country.name}"` or similar. Affects image search + a11y.

### 2.13 🟠 Stories listing — hardcoded category filter
`stories/index.astro:24` filters by hardcoded category strings. New categories silently disappear.
**Fix:** drive from a DB enum or category table.

### 2.14 🟠 Hardcoded FAQ on doctor profile pages
`doctor/[slug].astro:130–134` emits hardcoded generic FAQs (booking/reports/insurance) regardless of the doctor. Either pull from `listFaqsFor("doctor", id)` or remove.

### 2.15 🟠 About page only indexes English
`about/index.astro:71` sets `noindex={locale !== "en"}`. If non-English about content is substantively different, this discards organic traffic; if it's auto-translated, this is correct but should be paired with hreflang pointing back to `en`. Verify intent and make it explicit in the `translatedLocales` prop.

---

## 3. MEDIUM — Quality / E-E-A-T

### 3.1 🟡 Doctor-image avatar fallback alt
When `doctor.imageUrl` is null, the avatar shows just the initial letter; alt becomes that letter (e.g. "D"). Use `alt={doctor.imageUrl ? doctor.name : \`Avatar for \${doctor.name}\`}`.

### 3.2 🟡 PhotoBlock alt inheritance unclear
Multiple pages (`home`, `specialties/index`, `countries/index`, `city/[slug]`, `accreditation/[code]`, `country/[slug]`) use `PhotoBlock` which appears to derive alt from the `label` prop. Audit `PhotoBlock.astro` once and either pass explicit `alt` everywhere or document the contract.

### 3.3 🟡 Missing H2 below H1 on listing pages
`hospitals/index.astro`, `doctors/index.astro`, `specialties/index.astro` — H1 from `EntityListingHero`, then content jumps straight to filter UI. Add a clear `<h2>Browse hospitals</h2>` etc.

### 3.4 🟡 Treatment overview lacks dedicated sections
`treatment/[slug].astro` buries Preparation / How performed / Recovery in a multi-paragraph description. SEO-relevant subtopics deserve their own H2.

### 3.5 🟡 No condition links from treatment pages
Treatment pages link out to specialty + hospitals + cost but never to the conditions a treatment is indicated for. Bidirectional treatment ↔ condition linking strengthens the entity graph.

### 3.6 🟡 City pages lack geo schema
`city/[slug].astro` has no `Place` / `PostalAddress` / `GeoCoordinates`. Add `addressCountry: country.isoCode`, `addressLocality: city.name`, and lat/lng if available.

### 3.7 🟡 Country page doesn't link to the visa page
`country/[slug].astro` — no inline link to `/visa/[slug]`. Visa intent is a major medical-tourism cluster. Add a section.

### 3.8 🟡 Country `TouristDestination` schema doesn't carry ISO code
`country.isoCode` is available but not surfaced as `areaServed` / `identifier` in `touristDestinationJsonLd`.

### 3.9 🟡 Listing pagination — no `rel="prev"/"next"`
`blog/index`, `gallery/index`, hospital/doctor listings: page 2+ is correctly noindex'd, but no `rel="prev"/"next"` on page 1's `<head>`. Cheap win in `HeadMeta.astro` since `pathQuery` already exists for pagination canonicals.

### 3.10 🟡 No FAQ schema on city/country/specialty hospital listings
`hospitals/city/[citySlug]`, `hospitals/country/[countrySlug]`, `hospitals/specialty/[specialtySlug]` have rich "What to check / What to look for" editorial blocks but no `FAQPage` schema. Convert blocks to `<details>`-shaped FAQs and emit schema.

### 3.11 🟡 Hardcoded "800+ specialists" placeholder
`doctors/index.astro:62–66` hard-codes "800+" if `rows.length >= 24`. Read actual count from DB.

### 3.12 🟡 Hardcoded coordinator stats
`surgeons/index.astro:62` ("Contact desk: 9 min"), `match-me`, `for-hospitals` — placeholder numbers leak into public copy. Replace with data-driven values or remove.

### 3.13 🟡 Best-of methodology link is hardcoded to editorial-policy
`best/[slug].astro:174` — should link to a versioned methodology section, not generic editorial policy.

### 3.14 🟡 Best-of flag map has typos
`best/index.astro:45–53` — `hungary: 🇵🇭` (Philippines flag for Hungary). Audit all entries.

### 3.15 🟡 Glossary `long_definition` rendered as plain text
No paragraph/heading parsing for definitions that are multi-section. Simple HTML render or markdown-it would help.

### 3.16 🟡 Gallery uses `picsum.photos` placeholder fallback
`gallery/index.astro:141, 150` — `https://picsum.photos/...` shipped to production. Replace with a local placeholder or don't render the slot.

### 3.17 🟡 Blog RSS `enclosure` length hardcoded to "0"
`en/blog/rss.xml.ts:43` — RFC violation. Either compute actual byte size or drop the enclosure.

### 3.18 🟡 No locale-specific blog RSS feeds
Only `/en/blog/rss.xml`. If non-English blog content exists, generate `/[locale]/blog/rss.xml`.

### 3.19 🟡 `quote-plan` and `journey/[code]` have ambiguous index intent
Both are `noindex` but accessible by code. Either patient-private (correct) or shareable case-study (then index). Pick one and document.

### 3.20 🟡 Last-reviewed date not visible to users on QA / glossary
Schema has `dateModified`; UI only shows on blog and best/[slug]. For YMYL, surface the date next to the headline.

### 3.21 🟡 Q&A `acceptedAnswer.dateCreated` uses `updated_at`
`qa/[slug].astro:80` — semantics unclear. Use `datePublished` for the answer + `dateModified` if it's been edited.

### 3.22 🟡 Accreditation pages don't reference the certifying body as `Organization` schema
`accreditation/[code].astro` has the body's `website` but doesn't emit `Organization` schema for JCI / NABH / KTQ etc. Add a sibling `Organization` block.

### 3.23 🟡 Vimeo thumbnail extraction missing
`blog/[slug].astro:176` — only YouTube thumbs are extracted for `VideoObject` schema.

### 3.24 🟡 `translatedLocales` hardcoded to `["en"]`
`blog/index.astro:89` and several others — if blog is genuinely English-only, this is correct, but the rest of the site uses 8 locales. Audit each page's `translatedLocales` prop against actual translation coverage.

### 3.25 🟡 H1 on `medical-tourism-companies/[slug]` lacks the italic/qualifier pattern used elsewhere
Visual inconsistency with the rest of the site.

---

## 4. LOW — Polish

- 🟢 `404.astro` `WebPage` schema lacks `mainEntity` linking to nav/search options.
- 🟢 `og.ts` SVG font fallback rendering on older browsers — not verified.
- 🟢 `llms.txt` lacks a version/last-updated stamp.
- 🟢 `home` PhotoBlock components should explicitly declare `loading="lazy"` and `width`/`height` to prevent CLS.
- 🟢 `blog/index.astro:76` — "reply time" stat is placeholder.
- 🟢 `blog/[slug]` — tags parsed but never displayed to users.
- 🟢 `compare/treatments` success-rate color thresholds (≥90 green / ≥75 orange / <75 red) — document the source.
- 🟢 `surgeons/[specialty]/[country].astro` duplicates the doctor-card markup from `surgeons/[specialty]/index.astro` — extract a shared component.
- 🟢 Sticky right sidebars (treatment, hospital) — verify mobile INP.
- 🟢 Add explicit `width`/`height` on all `<img>` to prevent CLS.

---

## 5. Per-page summary table

Score = 0–10 based on combined depth + technical correctness. "★" = page family with strongest practice on that signal.

| Page | Score | Top issues |
|---|---|---|
| `index.astro` (home) | 9 | PhotoBlock alt, missing FAQ/CollectionPage schema |
| Root `index.astro` redirect | 10 | — |
| `404.astro` | 9 | WebPage schema lacks mainEntity |
| `500.astro` | 10 | — |
| `robots.txt.ts` | 7 | 5 sitemaps missing from declarations |
| `sitemap.xml.ts` | 8 | Mismatch with robots.txt |
| `sitemap-static.xml.ts` | 9 | — |
| `sitemap-hospitals.xml.ts` | 4 | 🔴 missing `eq` import |
| `og.ts` | 9 | SVG font fallback unverified |
| `en/blog/rss.xml.ts` | 8 | enclosure size hardcoded; no per-locale feeds |
| `public/llms.txt` | 9 | No version stamp |
| `about` | 8 | Non-English locales noindexed; verify intent |
| `hospital/[slug]` ★ | 9 | Thin-content noindex missing |
| `hospital/[slug]/[specialty]` | 9 | Missing noindex on zero-treatments |
| `hospital/[slug]/[specialty]/doctors` | 7 | Missing hospital schema; flat heading hierarchy |
| `hospitals/index` | 9 | Missing H2 below H1; bland meta description |
| `hospitals/city/[citySlug]` | 8 | No FAQ schema |
| `hospitals/country/[countrySlug]` | 8 | No FAQ schema |
| `hospitals/specialty/[specialtySlug]` | 8 | No FAQ schema |
| `doctor/[slug]` | 8 | Hardcoded FAQ; thin-content noindex missing |
| `doctors/index` | 8 | Missing H2; hardcoded "800+" stat |
| `doctors/city/[citySlug]` | 9 | — |
| `doctors/country/[countrySlug]` | 9 | — |
| `doctors/specialty/[specialtySlug]` | 9 | — |
| `doctors/specialty/[specialtySlug]/[citySlug]` | 9 | — |
| `condition/[slug]` ★ | 9 | — |
| `condition/[slug]/doctors` | 7 | Missing MedicalCondition schema |
| `conditions/index` | 9 | — |
| `treatment/[slug]` | 8 | Cannibalisation risk; missing H2 sections; no condition links |
| `treatment/[slug]/[country]` | 6 | No canonical, no withProvenance, no thin-page noindex |
| `treatment/[slug]/[city]` | 4 | 🔴 broken treatmentJsonLd call; no FAQ; no canonical |
| `treatment/index` | 8 | Below-ideal meta length; no withProvenance |
| `treatments/index` | 9 | — |
| `treatments/country/[countrySlug]` | 8 | Missing thin-page noindex |
| `specialty/[slug]` ★ | 10 | — |
| `specialties/index` | 8 | Missing explicit H2 |
| `country/[slug]` | 8 | Hero alt missing; no visa link; no ISO in schema |
| `countries/index` | 9 | — |
| `city/[slug]` | 7 | No geo schema; thin specialty schema |
| `visa/[slug]` | 9 | — |
| `cost/[slug]` | 9 | Cannibalisation w/ `/treatment/[slug]` |
| `blog/index` | 8 | `translatedLocales` hardcoded; placeholder reply-time |
| `blog/[slug]` | 9 | Reviewer not linked; cover credit missing |
| `qa/index` | 5 | 🔴 missing QAPage/FAQ schema; no pagination |
| `qa/[slug]` | 8 | Reviewer not linked; date semantics unclear |
| `glossary/index` | 5 | 🔴 hardcoded fake FAQ schema |
| `glossary/[term]` | 8 | No author byline; no citations |
| `best/index` | 4 | 🔴 undefined `crumbs`; flag-emoji typos; no CollectionPage schema |
| `best/[slug]` | 8 | No author/reviewer byline |
| `stories/index` | 7 | Hardcoded category filter; no schema |
| `gallery/index` | 6 | picsum placeholder in prod; no ImageObject schema |
| `surgeons/index` | 7 | Hardcoded stat |
| `surgeons/[specialty]/index` | 8 | Avatar alt fallback weak |
| `surgeons/[specialty]/[country]` | 7 | DRY violation; empty pages don't 404 |
| `accreditation/index` | 8 | No CollectionPage schema |
| `accreditation/[code]` | 7 | No certifying-body Organization schema; no thin-page noindex |
| `calculator` | 9 | — |
| `match-me` | 7 | No FAQ/HowTo schema; weak content depth |
| `quote` | 6 | No labels; no ContactPage schema |
| `quote-plan` | 5 | No schema at all; ambiguous index intent |
| `compare/hospitals` | 5 | 🔴 no `<h1>` |
| `compare/doctors` | 5 | 🔴 no `<h1>` |
| `compare/treatments` ★ | 9 | — |
| `compare/countries` | 9 | — |
| `find-specialist` | 7 | No labels; no ContactPage schema |
| `second-opinion` | 6 | 🔴 H1 may not render; no YMYL disclaimer |
| `emergency` | 5 | 🔴 no `<h1>`; no YMYL disclaimer |
| `emergency-triage` | 6 | No schema; no medical disclaimer |
| `insurance` | 9 | — |
| `services` | 9 | — |
| `for-hospitals` | 9 | — |
| `contact` | 7 | No labels; no ContactPage schema |
| `editorial-policy` ★ | 10 | — |
| `terms` | 8 | Consider CreativeWork schema |
| `privacy-policy` | 9 | — |
| `referral` | 7 | No labels; no schema |
| `incident-report` | 7 | No labels |
| `medical-board` ★ | 9 | — |
| `medical-tourism-companies/index` | 9 | — |
| `medical-tourism-companies/[slug]` | 7 | No Organization schema; H1 inconsistent |
| `portal/index` | 7 | No code-input label |
| `portal/[code]` | 7 | No breadcrumb schema |
| `portal/[code]/followup` | 7 | No breadcrumb schema |
| `portal/[code]/medications` | 6 | Placeholder content |
| `portal/[code]/recovery` | 7 | No breadcrumb schema |
| `journey/[code]` | 6 | Ambiguous noindex; no breadcrumb schema |
| `from/[countrySlug]` ★ | 9 | — |
| `pricing-index` ★ | 10 | — |
| `sitemap-browse` | 9 | — |

---

## 6. Prioritized fix plan

**Sprint 1 — Stop the bleeding (1–2 days)**
1. Fix `eq` import in `sitemap-hospitals.xml.ts` (5 min, unblocks indexing).
2. Define `crumbs` in `best/index.astro`.
3. Fix `treatmentJsonLd` call in `treatment/[slug]/[city].astro`.
4. Add `<h1>` to compare/hospitals, compare/doctors, emergency, second-opinion.
5. Remove or replace fake FAQ schema in `glossary/index.astro`.
6. Add `QAPage`/`FAQPage` schema to `qa/index.astro`.

**Sprint 2 — Indexation hygiene (3–5 days)**
7. Decide canonical strategy for `treatment × country × city × cost` and apply.
8. Add thin-content `noindex` defenses (8 listed in §2.3).
9. Add 5 missing sitemaps to `robots.txt`.
10. Add `withProvenance` to treatment/country schema.
11. Add hospital schema to hospital-scoped doctor rosters; condition schema to condition-scoped doctor rosters.

**Sprint 3 — YMYL/E-E-A-T (1–2 weeks editorial work)**
12. Add medical disclaimers to emergency / triage / second-opinion.
13. Editorial pass: add citations to blog/[slug], glossary/[term], condition/[slug].
14. Link reviewer names to `/medical-board#{slug}` everywhere they appear.
15. Surface "Last reviewed: {date}" on YMYL pages.

**Sprint 4 — Forms + a11y (2–3 days)**
16. Add `<label>`/`aria-label` to all forms (5 pages).
17. Add `ContactPage` + `contactPoint` schema to inquiry pages.
18. Add breadcrumb schema to portal subpages.

**Backlog — Quality (~25 medium items in §3)**
Address as time permits; none block ranking individually but compound.

---

## 7. What's already great

- **Schema infrastructure** (`seo.ts`) — 13+ factory functions with provenance support; better than most production sites.
- **i18n + hreflang** — proper `x-default`, RTL handling, OG locale mapping.
- **Listing-page filter logic** — country-only filters self-canonicalise, deeper combos noindex. This is the right call.
- **AI-friendly** — `robots.txt` allows GPTBot/Google-Extended/PerplexityBot; `llms.txt` is comprehensive.
- **Open data** — `pricing-index` ships with CC-BY-4.0 dataset schema + CSV/JSON exports. Strong AEO signal.
- **Editorial trust pages** — `editorial-policy`, `medical-board`, `pricing-index/methodology` are exemplars.
- **Specialty + condition detail pages** — 7+ logical H2s, schema-rich, multi-section editorial. Use them as the template for fixing thinner pages.

---

*End of audit.*
