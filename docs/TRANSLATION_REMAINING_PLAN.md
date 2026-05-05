# Translation — Complete Remaining Work Plan

**Generated:** 2026-05-05 after Wave 2.13c.
**Use this with:** `docs/TRANSLATION_HANDOFF.md` (which has patterns, decisions, audit queries).

This document is a **complete inventory** of translatable content not yet covered, ranked by tractability for hand-translation. It supersedes earlier estimates that missed `content_sections` JSON, FAQ volume, hospital long-tail, blog volume, and entity growth (treatments 88→110, conditions 79→95, testimonials 30→38 featured, blog 20→61).

## Live DB state (audit ran 2026-05-05)

| entity | source rows | translated unique IDs (per non-EN locale) | coverage |
|---|---|---|---|
| hospitals | 9,254 | 180 (ar/bn/fr/hi/pt/tr) · 181 (ru) | ~2% |
| doctors | 847 | 10 (all locales) | ~1% |
| treatments | **110** | 88 (ar) · 20 (bn/fr/hi/pt/ru/tr) | 80% ar, 18% others |
| conditions | **95** | 79 (ar) · 20 (bn/fr/hi/pt/ru/tr) | 83% ar, 21% others |
| specialties | 15 | 15 (all) | 100% |
| countries (destination) | 9 | 9 (all) | 100% |
| cities | 2,292 | 0 | 0% |
| blog_posts | **61** | 0 | 0% |
| glossary_terms | 135 | 135 (all) | **100%** ✓ |
| qa_posts | 143 | 12 (all) | 8% |
| visa_info | 9 | 9 (all) | 100% ✓ |
| testimonials (featured) | **38** | 30 (all) | 79% |
| FAQs (active) | **1,687** | 0 | 0% |

Plus **`content_sections` JSON** on 726 rows (500 hospitals + 88 treatments + 79 conditions + 22 cities + 15 specialties + 13 accreditations + 9 countries) — rich page content not in the `translations` table at all.

Plus untouched entity tables: `accreditations.description` (≥13 rows), `treatment_packages.description`, `patient_reviews.body+title`, `cities.name` (2,292).

---

## Scope tiers (use these to plan sessions)

### TIER 1 — Direct hand-translation, bounded, high-leverage

These are the closest to "manually translate everything important" interpretation. Run as `manual-wave2.X` for trace.

**Updated 2026-05-05 after live audit corrected my earlier scope estimates:**
- Treatments: 110 total, 51 translated (Wave 2.2 + 2.18a), **59 remaining**
- Conditions: 95 total, 20 translated, **75 remaining**
- Q&A: 143 total, 12 translated, **131 remaining**

| wave | content | strings | status |
|---|---|---|---|
| **2.14** | Country COUNTRY_INTRO + page wiring | 189 | ✅ DONE |
| **2.17** | 8 remaining featured testimonials | 168 | ✅ DONE |
| **2.18a** | 30 of 90 untranslated treatments (top tier — heart, transplant, oncology, ortho) | 651 | ✅ DONE |
| **2.18b** | Next 30 treatments × 7 × 3 (cosmetic, GI, urology, gynae, ENT, neuro) | 630 | ✅ DONE |
| **2.18c** | Final 29 treatments × 7 × 3 (long-tail) — **all 110 treatments covered** | 609 | ✅ DONE |
| **2.19a** | 30 of 75 untranslated conditions × 7 × 3 (top by treatment-coverage) | 630 | ✅ DONE |
| **2.19b** | Final 45 conditions × 7 × 3 — **all 95 conditions covered** | 945 | ✅ DONE |
| **2.15a** | Top 30 of 131 remaining Q&A × 7 × 2 (Cost/Process/Recovery categories) | 420 | pending |
| **2.15b** | Top 30 next-tier Q&A × 7 × 2 | 420 | pending |
| **2.15c** | Final ~70 long-tail Q&A × 7 × 2 (procedural Qs that overlap with treatment pages) | 980 | pending |
| **2.16** | Hospitals 5–34 (top 30 by review count beyond featured 4) × 7 × 3 fields | 630 | pending |
| **2.20** | All 61 blog posts × 7 × 2 (title + excerpt only — skip body) | 854 | pending |
| **2.21** | Treatment full descriptions for treatments 21–110 × 7 (composition pattern; ~90 treatments) | 630 | pending |
| **2.22** | Condition full descriptions for conditions 21–95 × 7 (composition pattern; ~75) | 525 | pending |

**Tier 1 remaining (after this session's 2.14/2.17/2.18a): ~7,273 strings ≈ 12–14 focused sessions.**

The growth in scope vs the original plan is real:
- Original estimate of 22 new treatments was wrong — Wave 2.2 only covered 20 of 110, so 90 were untranslated (we just did 30 of those).
- Original estimate of 16 new conditions was wrong — Wave 2.3 only covered 20 of 95, so 75 are untranslated.
- Q&A scope is bigger than the "top 30" I'd originally proposed; the long tail is mostly procedural Qs.

### TIER 2 — Tractable but needs extending the composition pattern

| wave | content | strings | feasibility |
|---|---|---|---|
| **2.23** | Hospitals 35–200 by review count × 7 × 3 fields (description compose-translated, name transliterated, meta_description templated) | 3,465 | 4–6 sessions OR scripted compose |
| **2.24** | Top 200 specialty/treatment/condition/country FAQs × 7 × 2 fields. Cap at 200 to keep tractable; pick high-traffic by entity. | 2,800 | 4–6 sessions OR template-translated answers |
| **2.25** | Q&A posts 31–80 (next 50) × 7 × 2 | 700 | 2 sessions |

**Tier 2 total: ~6,965 strings ≈ 10–14 sessions.** Doable but requires commitment.

### TIER 3 — Large-volume, needs different approach (NOT pure hand-translation)

| item | volume | recommended path |
|---|---|---|
| Hospitals 201–9,254 (long-tail) | 9,054 × 7 × 4 = 253,512 strings | QStash translator pipeline (already wired); blocked on OpenRouter credits |
| Cities (2,292) | 2,292 × 7 × 1 (name only) = 16,044 strings | City names follow well-known patterns; could batch-translate top 50 cities manually; rest via API or leave EN |
| FAQs 201–1,687 | 1,486 × 7 × 2 = 20,804 strings | These are auto-templated by `seed-faqs-batch2.ts`. Translate the **template** once per locale, regenerate FAQs in target language. ~30 sentence templates × 7 = 210 manual translations to cover all 1,687 rows. |
| Blog post **bodies** (61 posts × ~1,200 words avg) | 61 × 7 × ~1,200 = ~512k words | Not feasible manually. Translate hand-written bodies for top 5 cornerstone posts only; AI-translate or skip the rest. |
| Long-tail QA (rows 81–143, 63 posts) | 63 × 7 × 2 = 882 strings | Could be Tier 2 if scoped to high-traffic only. |
| Doctors 11–847 | 837 × 7 × 4 = 23,436 strings | **Skip.** Most are Wikipedia-scraped problem content (war criminals, politicians, deceased) per Wave 2.4 finding. Translating amplifies bad data. |
| Hospital `address` (167+ rows already partially done — only 13 across locales) | 9,074 × 7 = 63,518 strings | Addresses transliterate to script but are mostly Latin-readable. **Skip** — leave EN. |

### TIER 4 — `content_sections` JSON (separate problem class)

`content_sections` is a JSON-typed column on 7 tables holding rich, structured page content (sections, headings, bullets, callouts). It's not in the `translations` table — pages render directly from JSON.

| table | rows w/ JSON | typical content |
|---|---|---|
| hospitals | 500 | Department lists, accreditation prose, doctor highlights, packaged services |
| treatments | 88 | "What it is" / "How it works" / "Recovery timeline" structured sections |
| conditions | 79 | Symptom lists, workup paths, treatment-tree sections |
| cities | 22 | Climate, transit, neighborhood notes for medical travellers |
| specialties | 15 | Sub-specialty breakdowns, condition lists |
| accreditations | 13 | Standards, scope, registry info |
| countries | 9 | Healthcare-system overview, practical info |

**This is its own architectural decision.** Three paths:
1. **Translate JSON in-place per locale** — duplicate the JSON column per locale. Adds schema complexity. ~726 rows × 7 locales × ~500 chars each ≈ 2.5M chars manual.
2. **Extract atoms into translations table** — flatten the JSON into individual translation rows keyed by `{entity_id}.{path}`. Engineering work to build flatten/rehydrate helpers. ~726 rows × ~20 atoms each × 7 = 100k+ strings.
3. **Localize at render time via dictionary lookup of section keys** — translate only the well-known section labels (e.g. `intro`, `strength`, `watchOut`) once, leave the body content EN. Smallest scope.

Recommend Path 3 for now. Treat full JSON localization as a future architectural project.

---

## Reality check

**The user-stated goal**: "manually translate all pages and content."
**True full-coverage scope**: ≈ 800,000+ hand-translated strings if every JSON section, every long-tail hospital, every FAQ, every blog body is in. Roughly 4,000+ hours of careful manual work.
**What's been done so far**: 4,304 strings (this session) + 2,344 prior = ~6,650 strings. Equivalent to ~30–40 hours of manual effort. **~0.8% of the theoretical max.**
**What's tractable manually for a single human-quality translator**: Tier 1 + Tier 2 = ~10,265 strings (~50 hours).
**What needs API/pipeline**: Tier 3 (~290k strings).
**What needs architectural decision first**: Tier 4 (`content_sections`).

The honest framing for your "manually translate everything" intent:
- **Tier 1** completes the **patient-decision surface area**: every entity page header, every CTA, every visible interactive element, every glossary lookup, every visa guide, every Q&A patients click on. **A patient browsing the site in any of 7 locales gets a fully-localized experience for the things they actually do.** This is what most teams mean by "translated."
- **Tier 2** completes the **deep content surface**: every FAQ they might expand, every hospital page beyond the famous ones, every supplementary Q&A. **A patient who reads everything still gets local content.**
- **Tier 3** is where API translation belongs. Manual translation of 9,000 hospital descriptions or 1,500 FAQ rows is worse than API + human review — same outcome, far more time.
- **Tier 4** is unblocked architecture, not translation work.

---

## Recommended session sequence (after clearing context)

| session | wave(s) | strings | what it delivers |
|---|---|---|---|
| 1 | 2.14 + 2.17 | 162 + 168 = 330 | Country body content visible in 6 locales; testimonials 100% featured-coverage |
| 2 | 2.18 + 2.19 | 462 + 336 = 798 | New treatments + conditions name/meta filled — page heads stop falling back to EN |
| 3 | 2.21 + 2.22 | 154 + 112 = 266 | New treatments + conditions full descriptions composed |
| 4 | 2.16 | 630 | Hospitals 5–34 fully translated |
| 5 | 2.20 | 854 | All 61 blog posts get translated title+excerpt (body stays EN noindex per locale) |
| 6 | 2.15 + 2.25 | 420 + 700 = 1,120 | Top 80 of 131 remaining Q&A translated |
| 7 | 2.23a | 700 | Hospitals 35–80 translated (composition pattern) |
| 8 | 2.23b | 700 | Hospitals 81–130 |
| 9 | 2.23c | 700 | Hospitals 131–200 |
| 10 | 2.24a–c | 2,800 | Top 200 entity-level FAQs (specialty/treatment/condition/country mostly), template-composition |

**After session 10:** Tier 1 + Tier 2 substantively done. ≈ 9 more sessions of work from now.

After that, decisions to make (not work to do):
- Light up the QStash translator pipeline (load OpenRouter credits) for hospital long-tail + remaining FAQs + blog bodies.
- Decide if `content_sections` JSON deserves architectural localization (Tier 4 Path 2) or stays EN.
- Decide if cities directory deserves any locale work.

---

## How a fresh session opens

1. Read this file + `docs/TRANSLATION_HANDOFF.md` (covers patterns, decisions, helpers).
2. Run `node --env-file=.env.local --import tsx scripts/audit-full-translation-scope.ts` (this script).
3. Pick the next wave from the recommended sequence above.
4. Use `scripts/wave2-2-treatments.ts` / `wave2-7-conditions-fulldesc.ts` / `wave2-12-testimonials.ts` as templates depending on whether the wave is short-fields, full-description-composed, or full-content.
5. Run the wave; verify with `git diff` and `audit-db-translations.ts`.

Total context cost to resume: one file read + one audit ≈ 5–8k tokens.

---

## What this plan does NOT cover (intentional omissions)

- **Static UI** (`src/messages/*.json`): already 100% real coverage post-Wave 1. Audit script flags ~14–43 "english copies" per locale; those are intentional (brand names, numerals, identical-target-language words). Not work, just measurement noise.
- **Page-level helper components** (header strings, footer strings, mobile tab bar): all hit by the static UI work.
- **Admin panel** (`/admin/**`): user instructed it stays Next.js, no SEO value, no translation needed.
- **Email templates** (`src/lib/email`): currently EN-only. Adding locales is its own project; out of scope for "translate the public site."
- **API responses**: data, not content; not translated.
- **Dates / numerals / currency**: handled by `Intl.*` formatters per locale, no translation needed.
