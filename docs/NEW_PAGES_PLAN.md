# New Pages Plan — Treatments / Conditions / Doctors / Hospitals / Listings

Companion to `docs/SEO_KEYWORD_MAP.md`. That doc maps keywords onto *existing* templates and closed 5 gaps. This doc plans the *net-new* page families worth building, organized by the 5 entity buckets.

Date: 2026-05-20.

## 0 · Inventory reality check (live DB)

Page-count estimates below are grounded in actual inventory, not aspiration:

| Metric | Count | Implication |
|---|---|---|
| Active treatments | 113 | Treatment-side programmatic scales well |
| Conditions | 95 | Condition-side scales well |
| Active doctors | 847 | **Doctor-side is inventory-constrained** — only build where real depth exists |
| Cities | 2,292 | Most are thin |
| Cities with ≥3 active doctors | **44** | City-surgeon pages cap at ~44 cities, not hundreds |
| Hospitals with ≥3 active doctors | **66** | Hospital-doctor roster pages cap at ~66 |
| Hospitals with ≥1 priced treatment | 9,254 (all) | Hospital×treatment scales — but cap for quality, not coverage |

**Hard rule:** every programmatic family below has an inventory floor. A page with <3 real items is not built — it 404s or canonicalises to its parent. Thin pages trigger Google's helpful-content classifier; coverage for its own sake is a liability, not an asset.

## 1 · TREATMENTS

Existing: `/treatment/[slug]` · `/treatment/[slug]/[country]` (cost) · `/cost/[slug]` · `/best/[treatment]-in-[country]`

| # | New route | URL pattern | Est. pages | Data source | Content depth | Priority |
|---|---|---|---|---|---|---|
| T1 | `/compare/[slugA]-vs-[slugB].astro` | `/compare/gastric-sleeve-vs-gastric-bypass` | ~60 curated pairs | `treatments` + `hospital_treatments` price bands | **Editorial** — real comparison, not templated | **P1** |
| T2 | `/treatment/[slug]/recovery.astro` | `/treatment/cabg-heart-bypass/recovery` | 113 | `treatments.recoveryDays` + `content_sections` | **Editorial** — week-by-week, reviewer byline | P2 |
| T3 | `/specialty/[slug]/[country].astro` | `/specialty/oncology/india` | 135 (15×9) | `hospital_specialties` + `hospitals` | Templated OK | P3 (overlaps `/best/`) |

**T1 — Procedure comparison.** Highest-intent decision-stage queries ("gastric sleeve vs bypass", "FUE vs FUT", "LASIK vs SMILE vs PRK", "hip replacement vs resurfacing", "TAVI vs open valve"). Curate ~60 pairs that are genuinely decision-equivalent (same condition, different procedure). Page = side-by-side table (cost band, stay, recovery, success %, reversibility, candidacy) + "which is right for you" editorial + ranked hospitals offering both. **Not a doorway page** because each comparison is hand-written and answers a real fork. Slug parser splits on `-vs-`; 404 if either side isn't a treatment or the pair isn't whitelisted.

**T2 — Recovery guides.** "knee replacement recovery time", "CABG recovery" — top-funnel informational that converts on remarketing. One per treatment. Must be genuinely useful (week-by-week milestones, red flags, when-to-fly-home) with a named-reviewer byline — otherwise skip. `MedicalWebPage` + `FAQPage` schema.

**T3 — Specialty × country.** "oncology in india", "cardiology in turkey". Marginal: `/best/[specialty]-in-[country]` already owns the "best" query and `/specialty/[slug]` owns the un-geo'd query. Build only if T1/T2 land and there's appetite. Defer.

## 2 · CONDITIONS

Existing: `/condition/[slug]` · `/condition/[slug]/doctors` · `/condition/[slug]/[place]` (country + city)

| # | New route | URL pattern | Est. pages | Data source | Content depth | Priority |
|---|---|---|---|---|---|---|
| C1 | `/condition/[slug]/doctors/[country].astro` | `/condition/diabetes/doctors/india` | ~250 (capped to inventory) | `condition_specialties`/`condition_treatments` → `doctor_specialties` | Templated OK | P2 |
| C2 | `/condition/[slug]/treatment-options.astro` | `/condition/heart-blockage/treatment-options` | 95 | `condition_treatments` | **Editorial** — decision matrix | P3 |
| C3 | `/symptom/[slug].astro` | `/symptom/chest-pain` | ~40 | new `symptoms` table | **Editorial** — must be clinician-reviewed | P4 / hold |

**C1 — Country-scoped condition doctors.** Captures "best doctor in {country} for {condition}" (the keyword-dump pattern). Extends the existing country-agnostic `/condition/[slug]/doctors`. Only render combos where ≥3 doctors exist in that country for the condition's specialties; else 404. Title: `Best Doctors for {Condition} in {Country}`.

**C2 — Treatment-options decision page.** The condition detail page already lists treatments; a dedicated decision-matrix page (when surgery vs. when watchful waiting, first-line vs. salvage) only earns its URL if hand-written. Otherwise fold the content into the condition page. Decide after C1.

**C3 — Symptom pages.** "symptoms of X" is high-volume but purely informational, low commercial intent, and **high doorway-page risk** if templated. Only build if a clinician will review each one. Hold until there's editorial capacity — do not ship templated symptom pages.

## 3 · DOCTORS

Existing: `/doctor/[slug]` · `/surgeons/[specialty]` · `/surgeons/[specialty]/[country]`

> Constraint: 847 doctors total. Doctor-side programmatic is inventory-bound. Build only where depth exists.

| # | New route | URL pattern | Est. pages | Data source | Content depth | Priority |
|---|---|---|---|---|---|---|
| D1 | `/surgeons/[specialty]/[city].astro` | `/surgeons/cardiac-surgery/delhi` | ~150 (44 cities × specialties present) | `doctors`+`hospitals`+`cities`, `HAVING ≥3` | Templated OK | **P1** |
| D2 | `/hospital/[slug]/doctors.astro` | `/hospital/medanta-medicity/doctors` | ~66 | `doctors WHERE hospital_id` | Templated OK | P2 |
| D3 | `/doctor/[slug]/reviews.astro` | `/doctor/dr-naresh-trehan/reviews` | ~per doctor w/ reviews | `patient_reviews` | Templated OK | P3 (or fold into doctor page) |

**D1 — City-level surgeon pages.** The keyword dump is full of "best {specialty} surgeon in {city} india" (delhi, hyderabad, chennai, mumbai). Today `/doctors/specialty/[s]/[city]` 308-redirects to the *country* page — losing the city-specific SERP. Promote it to a real page. The current redirect file becomes the real page; only render when ≥3 doctors exist in that city+specialty, else keep redirecting to country. Title: `Best {SurgeonNoun} in {City}, {Country}`. Reuses the `surgeonNoun()` helper from `seo.ts`.

**D2 — All-doctors-at-hospital roster.** "doctors at apollo hospital". Currently only `/hospital/[slug]/[specialty]/doctors` (per-specialty) exists. Add a hospital-wide roster. Cap: hospitals with ≥3 doctors (66). `ItemList` of `Physician` nodes.

**D3 — Doctor reviews page.** Only if `patient_reviews` has real volume per doctor; otherwise render reviews as a section on the doctor detail page (no separate URL). Likely fold-in, not a new route. Decide after checking review counts.

## 4 · HOSPITALS

Existing: `/hospital/[slug]` · `/hospital/[slug]/[specialty]` · `/best/[specialty]-in-[country]` · `/best/[treatment]-in-[country]`

| # | New route | URL pattern | Est. pages | Data source | Content depth | Priority |
|---|---|---|---|---|---|---|
| H1 | extend `/best/[slug].astro` to accept **city** slugs | `/best/cardiac-surgery-in-mumbai` | ~300 (specialty/treatment × city, `HAVING ≥5`) | `hospital_specialties`/`hospital_treatments` + `cities` | Ranked list (real) | **P1** |
| H2 | `/hospital/[slug]/treatment/[treatmentSlug].astro` | `/hospital/medanta-medicity/treatment/cabg-heart-bypass` | ~600 (top-100 hospitals × priced treatments) | `hospital_treatments` | Templated OK, **doorway-risk — cap hard** | P2 |
| H3 | `/accreditation/[code]/[country].astro` | `/accreditation/jci/india` | ~90 real combos | `hospital_accreditations` + `cities` | Templated OK | P2 |

**H1 — City-level best-of.** Extends the work already done on `/best/[slug]` (G2). The `parseSlug()` "-in-" splitter currently resolves the right side as a country only. Add: if it's not a destination country, try `cities`. Render only when ≥5 hospitals exist for that specialty/treatment in the city. This makes `/best/cardiac-surgery-in-mumbai` and `/best/hair-transplant-fue-in-istanbul` real. Captures "best heart hospital in mumbai" class queries. Reuse the existing `SLUG_ALIASES` map.

**H2 — Hospital × treatment.** "CABG cost at Medanta", "hair transplant at hospital X". Real per-hospital pricing exists (9,254 hospitals priced). **Doorway risk is real here** — 9,254 × 6 treatments would be 55k thin pages. Hard cap: only the **top 100 hospitals** (featured / CoE / high review volume) × their priced treatments ≈ 600 pages. Each carries unique pricing + the hospital's specific program detail + surgeon list. Anything below the top-100 cap stays as a pricing row inside the existing `/hospital/[slug]/[specialty]` page — no standalone URL.

**H3 — Accreditation × country.** "JCI hospitals in india", "NABH accredited hospitals". Extends `/accreditation/[code]`. 13 bodies × 9 countries, render only combos with ≥3 accredited hospitals (~90). `ItemList` + `BreadcrumbList`.

## 5 · LISTINGS

Existing: `/hospitals` `/doctors` `/treatments` `/specialties` `/conditions` `/countries` `/blog` + redirect stubs (`/hospitals/country/*`, `/hospitals/city/*`, `/hospitals/specialty/*`, `/doctors/*`, `/treatments/country/*`)

| # | New route | URL pattern | Est. pages | Data source | Content depth | Priority |
|---|---|---|---|---|---|---|
| L1 | `/cities/index.astro` | `/cities` | 1 (+ optional region groups) | `cities` w/ hospital counts | Templated OK | **P1** |
| L2 | promote `/hospitals/specialty/[slug]` stub → real page | `/hospitals/specialty/oncology` | 15 | already-redirecting stub | Templated OK | P3 |
| L3 | `/treatments/[specialtySlug].astro` | `/treatments/cardiac-surgery` | 15 | `treatments WHERE specialty` | Templated OK | P3 (overlaps `/specialty/[slug]`) |

**L1 — Cities directory.** There is no `/cities` index — a real crawl-graph gap. The footer + sitemaps reference individual city pages but nothing links them coherently. Build `/cities` grouped by country (and optionally region), each city showing hospital count, linking to `/city/[slug]`. Pure mesh/crawl-budget value. 1 page.

**L2 / L3 — Stub promotion.** Several `/hospitals/specialty/[s]` style routes are 308-redirect stubs to query-filtered listings. Promoting them to real indexable pages is low-effort but low-yield — `/specialty/[slug]` and `/best/[specialty]-in-[country]` already own that intent. Defer; revisit only if Search Console shows the filtered URLs ranking.

## 6 · Doorway-page guardrails (apply to every family above)

1. **Inventory floor.** No page renders below its item threshold (≥3 doctors / ≥5 hospitals / whitelisted pair). Below floor → 404 or 301 to parent.
2. **Differentiated content.** Each page must carry something its parent doesn't — city-specific ranking, real per-hospital pricing, a hand-written comparison. If the only difference is a find-replace of the geo token, don't ship it as a separate URL; make it a filter.
3. **Canonical discipline.** Filter/alias variants `rel=canonical` to one authoritative URL (the `SLUG_ALIASES` 301 pattern from G2 is the model).
4. **Schema on every page** — `ItemList` / `MedicalProcedure` / `Physician` / `BreadcrumbList` as appropriate, via the existing `seo.ts` helpers.
5. **`noindex` untranslated locales** — keep the `isUntranslated()` guard so 7 English-copy locales don't dilute crawl budget.
6. **Editorial-tier pages get a named reviewer byline.** T1, T2, C2, C3 are not templated — they need real authorship or they don't ship.

## 7 · Build waves — STATUS (updated 2026-05-20)

**Wave 1 — P1 — ✅ SHIPPED** (commits `98fd42f`):
- D1 ✅ city-level surgeon pages — `/surgeons/[specialty]/[city]`
- H1 ✅ `/best/[slug]` extended to accept city slugs
- T1 ✅ procedure comparison pages — `/compare/[a]-vs-[b]`, 34 curated pairs
- L1 ✅ `/cities` directory

**Wave 2 — P2 — ✅ SHIPPED** (commit `98fd42f`):
- C1 ✅ country-scoped condition doctors — `/condition/[slug]/doctors/[country]`
- D2 ✅ all-doctors-at-hospital roster — `/hospital/[slug]/doctors`
- H2 ✅ hospital × treatment — `/hospital/[slug]/treatment/[t]` (top-150 cap)
- H3 ✅ accreditation × country — `/accreditation/[code]/[country]`
- T2 ✅ recovery guides — `/treatment/[slug]/recovery`, 113 pages

Plus data fix `a207172`: backfilled `condition_specialties` for 5 orphan conditions.

**Wave 3 — disposition (closed 2026-05-20):**
- T3 ✅ **SHIPPED** (commit after `98fd42f`) — `/specialty/[slug]/[country]` specialty×country hub. It's distinct enough from `/best/` (a full hub vs a ranked list) to be its own page; 98 indexable pairs.
- C2 ❌ **WON'T BUILD** — `/condition/[slug]/treatment-options` duplicates the treatment list already on the `/condition/[slug]` detail page. Folded, not a separate route.
- C3 ⏸ **HELD** — `/symptom/[slug]` symptom pages. Templated symptom pages on a YMYL medical site are a thin-content / doorway-page liability. Build only when a clinician can review each one — a deliberate quality decision, not a backlog miss.
- L2 ❌ **WON'T BUILD** — promoting the `/hospitals/specialty/[slug]` redirect stub is redundant now that `/specialty/[slug]`, `/specialty/[slug]/[country]` (T3) and `/best/[specialty]-in-[country]` all own the specialty intent.
- L3 ❌ **WON'T BUILD** — `/treatments/[specialtySlug]` duplicates the treatment list on `/specialty/[slug]`.
- D3 ❌ **WON'T BUILD as a route** — patient reviews render as a section on `/doctor/[slug]`; a standalone `/doctor/[slug]/reviews` isn't warranted at current review volume.

**All planned page work is complete.** The won't-build items are closed deliberately — building them would duplicate existing pages or create thin-content SEO risk, against the §6 doorway-page guardrails.

## 8 · Shared infrastructure these need

## 8 · Shared infrastructure these need

Before Wave 1, land these once so the page templates stay thin:

- **Queries** (`astro/src/lib/queries.ts`): `listSurgeonsForSpecialtyCity()`, `listHospitalDoctors()`, `getHospitalTreatment()`, `listAccreditedHospitalsByCountry()`, `listCitiesWithCounts()`, `getTreatmentComparison()`, `listConditionDoctorsByCountry()`.
- **`/best/[slug]` parser**: extend the `-in-` resolver to try `cities` after `countries` (H1). Reuse `SLUG_ALIASES`.
- **City inventory guard**: a shared `hasMinInventory(kind, ...)` helper so every page enforces the floor identically.
- **Sitemap children**: new `sitemap-comparisons.xml`, `sitemap-best-cities.xml`, `sitemap-surgeons-cities.xml`; register in the sitemap index.
- **Cross-linking**: add the new families to `ExploreGrid` blocks on parent pages (treatment → comparison; specialty → city-best-of; hospital → hospital×treatment) so they're crawl-reachable, not orphaned.
- **Comparison whitelist**: a curated `TREATMENT_COMPARISONS` array (the ~60 pairs) — single source of truth for routing + sitemap.

## 9 · Net URL impact (English base, ×8 locales for total)

| Family | Base URLs | Priority |
|---|---|---|
| D1 city surgeons | ~150 | P1 |
| H1 city best-of | ~300 | P1 |
| T1 comparisons | ~60 | P1 |
| L1 cities index | 1 | P1 |
| C1 condition doctors × country | ~250 | P2 |
| D2 hospital doctor rosters | ~66 | P2 |
| H2 hospital × treatment | ~600 | P2 |
| H3 accreditation × country | ~90 | P2 |
| T2 recovery guides | 113 | P2 |
| **Total P1+P2** | **~1,630 base** (~13,000 across 8 locales) | |

Proportionate to the existing ~57k-URL footprint, and every page clears the inventory floor — this is mesh densification, not doorway inflation.
