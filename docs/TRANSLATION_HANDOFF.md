# Translation Handoff (manual hand-translation project)

Drop-in context for resuming the manual translation work in a fresh Claude session.
**Last session ended:** 2026-05-05 after Wave 2.11.
**User intent:** "manually translate all pages and content" — Path B (full-parity for top entities + code wiring + content). Explicitly NOT API/AI-translated; quality bar is hand-curated.

---

## Quick orient — what to do in the first turn of a new session

Run this to confirm DB state matches the table below:

```bash
node --env-file=.env.local --import tsx scripts/audit-db-translations.ts
```

Then check this file for what's left, pick the next wave, and proceed.

---

## Locales (8 total, 7 non-EN)

`en` (source) · `ar` · `bn` · `fr` · `hi` · `pt` · `ru` · `tr`

`ar` is RTL. `fr/pt/ru/tr` are case-aware (capitalize sentence-start substitutions).
`ar/bn/hi` don't have case — skip capitalization helper for those.

---

## Translation infrastructure (already wired)

### `translations` table

```
translations(translatable_type, translatable_id, locale, field_name, value,
             is_machine_translated, is_reviewed, reviewed_by, reviewed_at)
unique on (translatable_type, translatable_id, locale, field_name)
```

`TranslatableType` (in `astro/src/lib/translate.ts`) supports:
`hospital | doctor | treatment | specialty | condition | country | city | blog_post | glossary | qa_post | visa_info | testimonial`

Pages that read translations (Wave 2.8 wired the last four):
- hospital, doctor, treatment, specialty, condition, country (name only — see "known issues" for description)
- glossary index + detail
- qa index + detail
- visa detail
- homepage hero testimonial + hospital page testimonial cards

### Standard wave script pattern

Every `wave2-N-X.ts` follows the same shape — copy it. Key bits:

```typescript
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];

// data: per-entity { id, slug, fieldA: Record<Locale,string>, fieldB: ... }

await db.execute(sql`
  INSERT INTO translations (translatable_type, translatable_id, locale, field_name, value,
                            is_machine_translated, is_reviewed, reviewed_by, reviewed_at)
  VALUES ('<TYPE>', ${id}, ${locale}, ${field}, ${value}, false, true, 'manual-wave2.N', NOW())
  ON CONFLICT (translatable_type, translatable_id, locale, field_name)
  DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                reviewed_by = 'manual-wave2.N', reviewed_at = NOW(), updated_at = NOW()
  RETURNING (xmax = 0) AS inserted
`);
```

Use `reviewed_by = 'manual-wave2.N'` so you can trace which wave wrote what.

Run with: `node --env-file=.env.local --import tsx scripts/wave2-N-X.ts` from repo root (NOT from `astro/`).

---

## Translation-quality decisions (use these consistently)

1. **Acronyms stay canonical** in all locales. CABG, MRI, ICSI, IVF, JCI, NABH, ISO, USHAŞ, ERAS, FRRO, CT, PET, ECG, AMH, PSA, etc. — never translate or transliterate.
2. **Branded/technical procedure names stay EN** when listed inside translated paragraphs. Inside a Russian condition description, "Treatment options include CyberKnife, CAR-T Cell Therapy, Robotic Radical Prostatectomy" — keep those names in EN. They're recognized internationally and translating them creates ambiguity.
3. **Doctor/place names**: transliterate for non-Latin scripts (`ar/bn/hi/ru`); keep Latin spelling for `fr/pt/tr`. "Dr." prefix → `د.` / `ডা.` / `Dr` / `डॉ.` / `Dr.` / `Д-р` / `Dr.`
4. **Hospital names** stay canonical across all locales (Medanta - The Medicity, Cleveland Clinic Abu Dhabi, etc.) — only the surrounding prose translates.
5. **Numbers + currencies** stay as-is (`28%`, `$0`, `9,254`, `48 h`, `5-15%`). Don't localize numerals to native scripts (e.g. don't convert `48` to `৪৮` for Bengali — readers expect Latin numerals in this domain).
6. **Sentence-start capitalization** for case-aware locales: when a name is substituted at the start of a translated sentence (e.g. `{NAME} est une intervention...`), wrap with `capFirst(name, locale)` for `fr/pt/ru/tr`. Skip for `ar/bn/hi` (non-cased scripts). Reference impl in `scripts/wave2-6-treatments-fulldesc.ts`.
7. **Description composition** for treatments and conditions: build long-form descriptions from sentence-template libraries (one per category × locale) + mechanical substitution. Mirror the EN script structure. References:
   - `scripts/wave2-6-treatments-fulldesc.ts` (4 paragraphs: lede / stay+recovery / outcomes / cost-drivers; categories: cardiac, ortho, oncology, eye, dental, pediatric, fertility)
   - `scripts/wave2-7-conditions-fulldesc.ts` (3 paragraphs: lede / pathway / destination; categories: oncology, ortho, gi, fertility, cosmetic, general, cardiac, pediatric)
8. **Severity hedge** appended to condition lede paragraph (when severity is set): "It's a serious condition…" / "moderately serious" / "Most cases are mild…" — locale-specific, see `wave2-7` `sev` map.
9. **`noindex` policy on translated pages**: `noindex={isUntranslated(locale, ...maps)}` — only noindex when no translation rows exist for that entity/locale. Don't blanket-noindex non-English locales.
10. **Email addresses, phone placeholders, brand names** (`MedCasts`, `WhatsApp`, `care@medcasts.com`, `+91 98765 43210`) — keep identical across locales. Audit script flags them as "english copies" but they're correctly identical.

---

## Wave status table (as of session end 2026-05-05)

| wave | content | strings | reviewed_by tag | status |
|---|---|---|---|---|
| 1a | EN bug `quotePage.whyStat3Num`: `/bin/zsh` → `$0` (8 locales) | 8 | (UI files) | ✅ |
| 1b | 2 missing UI keys × 7 non-EN locales | 14 | (UI files) | ✅ |
| 1c | UI english-copies audit (intentional, no change) | — | — | ✅ |
| 2.1 | 9 destination countries × 6 locales (name) | 54 | manual-wave2.1 | ✅ |
| 2.2 | 20 treatments × 7 locales (name + metaTitle + metaDescription) | 420 | manual-wave2.2 | ✅ |
| 2.3 | 20 conditions × 7 locales (name + metaTitle + metaDescription) | 420 | manual-wave2.3 | ✅ |
| 2.4 | 10 featured doctors × 7 locales (name + title + bio) | 210 | manual-wave2.4 | ✅ |
| 2.5 | 3 hospitals × 7 locales (meta_description) | 21 | manual-wave2.5 | ✅ |
| 2.6 | 20 treatments × 7 locales (full description) | 140 | manual-wave2.6 | ✅ |
| 2.7 | 20 conditions × 7 locales (full description) | 140 | manual-wave2.7 | ✅ |
| 2.8 | Engineering: glossary/QA/visa/testimonial pages wired to translations | code | (page files) | ✅ |
| 2.9 | 40 glossary terms × 7 locales (term + short_definition) | 560 | manual-wave2.9 | ✅ |
| 2.10 | 12 high-impact Q&A × 7 locales (question + answer) | 168 | manual-wave2.10 | ✅ |
| 2.11 | 9 visa info × 7 locales (overview + requirements + tips) | 189 | manual-wave2.11 | ✅ |
| 2.12 | 30 featured testimonials × 7 locales (patient_name + title + story) | 630 | manual-wave2.12 | ✅ |
| 2.13a | 30 glossary (Cardiology/Evidence/Fertility/Imaging/Insurance/Neurology/Oncology) | 420 | manual-wave2.13a | ✅ |
| 2.13b | 32 glossary (Oncology markers/Ortho/Payment/Pharmacology/Recovery) | 448 | manual-wave2.13b | ✅ |
| 2.13c | 33 glossary (Recovery/Regulatory/Specialty/Surgery/Urology/Visa) | 462 | manual-wave2.13c | ✅ |
| 2.14 | Country COUNTRY_INTRO (intro/strength/watchOut) × 9 × 7 + page wiring + UAE slug fix | 189 + code | manual-wave2.14 | ✅ |
| 2.17 | 8 remaining featured testimonials × 7 × 3 — testimonials now 38/38 (100%) | 168 | manual-wave2.17 | ✅ |
| 2.18a | 30 of 90 untranslated treatments × 7 × 3 (Heart valves, transplants, advanced cancer, ortho mainstays) | 651 | manual-wave2.18a | ✅ |
| 2.18b | 30 of 60 untranslated treatments × 7 × 3 (cosmetic, GI, urology, gynae, ENT, neuro) | 630 | manual-wave2.18b | ✅ |
| 2.18c | final 29 untranslated treatments × 7 × 3 (bariatric, cardiac long-tail, dental, fertility, neuro, ophtho, transplant, ortho long-tail) — **all 110 treatments now have name+metaTitle+metaDescription in 7 locales** | 609 | manual-wave2.18c | ✅ |
| 2.19a | top 30 of 75 untranslated conditions × 7 × 3 (3-treatment + key 2-treatment + cardiac gateways) | 630 | manual-wave2.19a | ✅ |
| 2.19b | final 45 conditions × 7 × 3 — **all 95 conditions now have name+metaTitle+metaDescription in 7 locales** | 945 | manual-wave2.19b | ✅ |
| 2.21 | 29 mid-tier treatments × 7 × 1 (full description) — adds 4 new procedure categories: cosmetic, bariatric, gi, neuro. 3-paragraph structure (lede / journey / cost+closer). | 203 | manual-wave2.21 | ✅ |
| 2.22 | 30 high-priority conditions × 7 × 1 (full description) — adds 3 new condition categories: eye, ent, neuro (plus extras for cardiac, ortho, gi). 3-paragraph (lede+severity / pathway / destination). | 210 | manual-wave2.22 | ✅ |
| 2.23 | 27 mid-tier treatments × 7 × 1 (full description) — adds 8 specialty templates: ENT, urology, gyne, ophtho, transplant, dental, fertility, neuro-extras (incl. liver+kidney transplant which W2.6 missed). | 189 | manual-wave2.23 | ✅ |
| 2.24 | final 34 treatment descriptions × 7 — closes the gap. Cardiac long-tail (9), oncology (12), ortho long-tail (11), GI extras (2). **All 110 treatments now have full descriptions in 7 locales.** | 238 | manual-wave2.24 | ✅ |
| 2.25 | final 45 condition descriptions × 7 — closes condition coverage. Cardiac (4), oncology (7), ortho (9), gi (4), urology/end-stage-organ (7), endocrine (2), fertility (4), pediatric (3), cosmetic (5). **All 95 conditions now have full descriptions in 7 locales.** | 315 | manual-wave2.25 | ✅ |

**Cumulative project: 9,281 hand-translated strings.**
**This session (2.18b → 2.25): 3,969 strings.**

---

## Remaining scope (priority order)

### Wave 2.14 — Country `COUNTRY_INTRO` localization (code + content) (recommended next)

- Currently hardcoded EN dict in `astro/src/pages/[locale]/country/[slug].astro` lines 60-101 (`COUNTRY_INTRO` map with `intro`, `strength`, `watchOut` per country slug).
- **Two parts**:
  - **Code change**: replace inline dict with translation-table lookup. Store as `translatable_type='country'` with `field_name='intro'/'strength'/'watchOut'`.
  - **Content**: 9 countries × 7 locales × 3 fields = 189 strings.
- **Bug noted earlier**: `COUNTRY_INTRO` keys use `"united-arab-emirates"` but DB slug is `"uae"` — UAE falls through to `seoDescription`. Fix the lookup before translating.
- **Translatable type**: `country` (already in TranslatableType enum).
- **Page wiring**: `country` page already applies `name` translation (line 40); add `intro/strength/watchOut` to the `applyTranslated` fields list.

### Wave 2.15 — Remaining 131 Q&A posts

- **Source**: `qa_posts` rows NOT in `(SELECT translatable_id FROM translations WHERE translatable_type='qa_post' AND reviewed_by='manual-wave2.10')`.
- **Strings**: 131 × 7 × 2 = 1,834. **Heaviest remaining wave.**
- **Recommendation**: Cap at top 30 by category-importance + answer-length-feasibility (skip very-long Procedures Qs > 1k chars; defer to per-treatment description duplication). Categories to prioritize: Cost (16 remaining), Process (11 remaining), Recovery (13), Travel (13), Safety (4 remaining).
- **Translatable type**: `qa_post`.

### Wave 2.16 — Top 200 hospital expansion

- 549 already translated in earlier project phase + Wave 2.5 added 21 strings for top 4 featured.
- Top tier (181-200 by review count) needs name + description + meta_description.
- **Strings**: ~20 × 7 × 3 = 420 (descriptions are templated per existing `template-hospital-descriptions.ts` patterns; can compose-translate).
- **Lower priority** — coverage is already 6% of all 9,254 hospitals.

### Wave 2.17 — Blog posts (feasibility issue)

- 20 blog posts × 7 locales × (title + excerpt + content) = ~500 strings.
- Each post body is 1,000-2,000 words. **Manual translation of full blog content is ~140k words across all locales.** Not feasible at quality bar.
- **Recommendation**: translate title + excerpt only; leave content EN with locale-aware noindex. Or skip entirely — blog SEO is lower-priority than entity pages.
- **Translatable type**: `blog_post` (already in TranslatableType).

### Out-of-scope for manual

- 9,054 remaining hospitals (would be ~250k strings). Stays via QStash translator when OpenRouter credits available.
- ~1,500 remaining FAQ rows. Same reasoning.
- 837 non-featured doctors (Wikipedia-scraped, many problematic — see Wave 2.4 doc).

---

## Known issues / open questions

1. **`COUNTRY_INTRO` UAE slug mismatch** (see Wave 2.14 above). Fix when localizing.
2. **Hospital `meta_title`** has zero EN values for top 4 featured hospitals — page constructs title dynamically. Don't translate meta_title for hospitals.
3. **Country description orphan rows** — `translations` has `country.description` for AR (9 rows) but country page only applies `name`. Description rows are dormant; need code change in Wave 2.14 to render them. Alternatively add `description` to `applyTranslated(...)` field list in `country/[slug].astro` — but `countries` table has no `description` column, so Drizzle doesn't expose the field. Either add the column + migration, or special-case the lookup.
4. **French quality flag**: `Cancer du sein est un cancer...` reads like a Wikipedia-style intro (no definite article). It's grammatically acceptable for encyclopedic prose but a French native reviewer might prefer `Le cancer du sein est un cancer...`. Same for `Maladie coronarienne`, `Hernie discale`, `Tumeur cérébrale`. If user flags this, fix `wave2-7` `lede.cancer/cardiac/ortho` templates to add definite articles, then re-run.
5. **Linter pass during session** modified `index.astro` and `hospital/[slug].astro` after my edits — kept those edits; verified no conflict with translation reads.

---

## Audit queries for next session

```bash
# Full status summary
node --env-file=.env.local --import tsx scripts/audit-db-translations.ts

# What was written by which wave
node --env-file=.env.local --import tsx -e "
const postgres = (await import('postgres')).default;
const sql = postgres(process.env.DATABASE_URL);
const r = await sql\`
  SELECT reviewed_by, translatable_type, locale, COUNT(*)::int AS c
  FROM translations
  WHERE reviewed_by LIKE 'manual-wave%'
  GROUP BY 1,2,3 ORDER BY 1,2,3
\`;
for (const row of r) console.log(row.reviewed_by.padEnd(20)+' | '+row.translatable_type.padEnd(12)+' | '+row.locale+' | '+row.c);
await sql.end(); process.exit(0);
"

# Find which entities are NOT yet translated for a type
node --env-file=.env.local --import tsx -e "
const postgres = (await import('postgres')).default;
const sql = postgres(process.env.DATABASE_URL);
const r = await sql\`
  SELECT id, slug FROM glossary_terms WHERE id NOT IN (
    SELECT translatable_id FROM translations
    WHERE translatable_type='glossary' AND reviewed_by='manual-wave2.9'
  ) ORDER BY id
\`;
console.log('Untranslated glossary IDs ('+r.length+'):');
for (const row of r) console.log('  '+row.id+' '+row.slug);
await sql.end(); process.exit(0);
"
```

---

## Spot-check URLs (after each wave, verify these render)

- `/fr/treatment/cabg-heart-bypass` — full FR description (Wave 2.6)
- `/ru/condition/breast-cancer` — full RU description (Wave 2.7)
- `/ar/glossary/cabg` — AR glossary entry (Wave 2.8 + 2.9)
- `/hi/glossary` — HI index page
- `/tr/qa/how-is-medcasts-paid` — TR Q&A (Wave 2.10)
- `/pt/visa/germany` — PT visa guide (Wave 2.11)
- `/bn/doctor/dr-naresh-trehan` — BN doctor profile (Wave 2.4)
- `/ar/country/india` — AR country page (Wave 2.1 — name only; description shows EN until 2.14)

---

## Files of note

- `scripts/wave2-1-country-names.ts` — country names (smallest pattern, good template)
- `scripts/wave2-2-treatments.ts` — short fields with metaTitle/metaDescription helper functions
- `scripts/wave2-6-treatments-fulldesc.ts` — composition-based long-form (templated paragraphs × 7 locales)
- `scripts/wave2-7-conditions-fulldesc.ts` — same pattern, 3-paragraph variant
- `scripts/wave2-9-glossary.ts` — fixed 40-row dictionary structure (good for scaling to 95 remaining)
- `scripts/wave2-10-qa.ts` — Q&A with multi-paragraph answers (~700 chars each)
- `scripts/wave2-11-visa.ts` — biggest single script of the session (~30k chars TS) — represents practical upper bound for one wave
- `astro/src/lib/translate.ts` — `TranslatableType` union (extend if adding new entity types)
- `astro/src/pages/[locale]/glossary/{index,[term]}.astro` — reference for read-from-translations wiring pattern
- `docs/CONTENT_AUDIT.md` — original content audit (some items now stale; many P-tier items shipped in earlier phases)
