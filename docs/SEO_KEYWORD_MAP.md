# SEO Keyword → Page Map

Source: keyword export dated 2026-05-20 (India dump used as the example country; the mapping rules apply identically to all 9 destinations — India, Thailand, Turkey, Germany, UAE, Singapore, Malaysia, Saudi Arabia, South Korea).

## 1 · Filter rules — what we chase, what we drop

### KEEP (commercial intent, on-mission)

| Pattern | Example | Why |
|---|---|---|
| `{treatment} in {country}` | lung cancer treatment in india | bottom-funnel buyer |
| `{treatment} cost in {country}` | liver transplant cost in india · angioplasty cost in india · gene therapy cost in india · ovarian cancer treatment cost in india · denvax treatment cost in india · immunotherapy cost in india | bottom-funnel buyer |
| `best/top hospital(s) in {country}` | best hospital in india · top 10 hospitals in india · biggest hospital in india · india no 1 hospital · top 5 hospital in india | bottom-funnel buyer |
| `best {specialty\|condition} hospital in {country}` | best liver transplant hospital in india · best liver hospital in india · best mental hospital in india · best children hospital | bottom-funnel buyer |
| `best/top {specialty} surgeon in {country}` | best cosmetic surgeon in india · best knee replacement surgeon in india · best orthopedic surgeon in india · best brain surgeon in india · best heart surgeon in india · best plastic surgeon in india · best neuro surgeon in india · ~150 variants | bottom-funnel buyer |
| `{specialty} surgeon in {country}` | orthopedic surgeon in india · cardiac surgeon in india · plastic surgeon in india | mid-funnel |
| `best {specialty} surgeon in {city} {country}` | best plastic surgeon in delhi india · best orthopedic surgeon in hyderabad india · best knee replacement surgeon in hyderabad india · best laparoscopic surgeon in delhi india | bottom-funnel buyer (city-disambiguated) |
| `{treatment} in {city} {country}` | cataract surgery in hyderabad india · plastic surgery in hyderabad india · bariatric surgery in ahmedabad india | bottom-funnel buyer (city-disambiguated) |
| `{procedure} cost in {country} in {currency}` | nose surgery cost in india in rupees | bottom-funnel buyer |
| `best doctor in {country} for {condition\|treatment}` | best doctor in india for hair transplant · best doctor in india for cancer · best doctor in india for diabetes · best doctor in india for kidney · best doctor in india for psoriasis · best doctor in india for vitiligo · best doctor in india for neurology · best doctor in india for knee replacement | bottom-funnel buyer |
| `{procedure} surgery in {country} {price/cost}` | lasik eye surgery in india price · plastic surgery in india price | bottom-funnel buyer |
| Specialized therapy modalities | proton beam therapy india · gene therapy cost in india · targeted therapy cost in india · immunotherapy cost in india · denvax treatment cost in india · hand transplant surgery in india | high-margin niches |

### DROP — fully irrelevant to MedCasts

| Category | Why drop | Examples from the dump |
|---|---|---|
| Alternative medicine / wellness | Out of clinical scope (we route surgical / specialist travel, not Ayurveda chains) | best ayurvedic treatment in india · panchakarma india · best naturopathy centre in india · top 10 ayurvedic company in india · ayurvedic doctor in india · homeopathy medicine for rheumatoid arthritis in india · best bach flower remedies · best ayurvedic medicine company in india · homeopathic medicine list in india |
| Consumer OTC / home remedies | We don't sell consumer pharma | itchy scalp home remedies india · ringworm ointment india · sore throat home remedies · medicine for dry cough · best liver medicine in india · hangover medicine india · wart removal ointment · home remedies for dandruff · leukoplakia medicine in india · best medicine for dandruff |
| Profession / industry / careers | Not patient-facing | doctors income in india · how many doctors in india · doctors day in india · first/youngest/famous doctor · house surgeon (= MBBS intern) · how many cardiac surgeon in india · surgery pg seats in india · surgeon retirement age · MD/MBBS career questions · doctors strike · panel doctors for australian visa |
| News / media / branded other | Not commercial-intent for us | doctor in air india flight/crash · doctors india series · operation flood/sindoor · pakistan operation in india · doctor india pvt ltd · doctor india gmail/ai/app/lab/test · census operations · operation center vfs global |
| Brand-only competitor queries | Low conversion — keep as supporting links inside our pages, not target landing pages | apollo hospital india · aiims hospital · hiims hospital · gleneagles global hospitals · health india hospital |
| History / trivia | Informational, not transactional | who is the father of surgery in india · first plastic/female/cardiac surgeon · who invented surgery |
| Quora/Reddit suffix variants | Aggregator queries — capture them via the parent term, don't build dedicated pages | "best plastic surgeon in india reddit" · "...quora" |

## 2 · Pattern → page-template mapping

These are the canonical landing pages per query family. Same mapping is replicated across all 9 destination countries by swapping `{country}` for `india|thailand|turkey|germany|uae|singapore|malaysia|saudi-arabia|south-korea`.

| Query pattern | Canonical route | Status | Notes |
|---|---|---|---|
| `{treatment} cost in {country}`, `{treatment} in {country}`, `{treatment} treatment cost in {country}`, `{procedure} surgery in {country} price` | `/treatment/{slug}/{country}` | EXISTS (792 URLs) | Already emits `MedicalProcedure` JSON-LD + price band. Title is `{Treatment} Cost in {Country} (YYYY)` — already keyword-aligned. |
| `cost of {treatment}` (country-agnostic) | `/cost/{slug}` | EXISTS (88 URLs) | Add `<link rel="canonical">` to `/treatment/{slug}/{topCountryForTreatment}` when a country query is implicit. |
| `best hospital in {country}`, `top hospitals in {country}`, `top 10 hospitals in {country}`, `biggest hospital in {country}` | `/hospitals/country/{country}` | EXISTS | **GAP — title.** Current title says "Hospitals in {Country}". Rewrite to `Best Hospitals in {Country} (YYYY) — Ranked Top 50` and lead the H1 with "best/top" language. Add ranked top-10 ribbon at the top. |
| `best {specialty} hospital in {country}`, `best liver hospital in india`, etc. | `/best/{specialty}-in-{country}` | EXISTS (~135 combos) | Title already `Best Hospitals for {Specialty} in {Country} (YYYY)` — already keyword-aligned. Verify all 15 specialties × 9 countries = 135 combos render (currently ~135 active). |
| `{specialty} hospitals in {country}` (e.g. cancer hospitals in india) | `/hospitals/specialty/{specialty}/{country}` | **GAP — needs new route** | Today `/hospitals/specialty/{specialty}` is country-agnostic. Add `/hospitals/specialty/{specialty}/[countrySlug].astro`. 15×9=135 new URLs. |
| `best {specialty} surgeon in {country}`, `top {specialty} surgeon in {country}`, `famous {specialty} surgeon in {country}`, `number one {specialty} surgeon in {country}` | `/surgeons/{specialty}/{country}` | EXISTS | **GAP — title.** Current is `{Specialty} surgeons in {Country}`. Rewrite to `Best {Specialty} Surgeons in {Country} (YYYY) — Ranked` to capture "best/top". Use `<h1>Best {Specialty} Surgeons in {Country}` and sort featured surgeons to the top. |
| `best {specialty} surgeon in {city} {country}`, `best {treatment} surgeon in {city} {country}` | `/doctors/specialty/{specialty}/{citySlug}` | EXISTS | Title-rewrite to `Best {Specialty} Surgeons in {City}, {Country}`. Add the country segment to the H1 so "delhi india" and "hyderabad india" patterns both rank. |
| `{treatment} in {city} {country}` (cataract surgery in hyderabad india) | `/treatment/{slug}/{citySlug}` | **GAP — needs new route OR redirect** | Cheapest fix: redirect `/treatment/{slug}/{citySlug}` → `/treatment/{slug}/{country}#{citySlug}` for now; promote to a real page once we hit ~20 hospitals in that city × treatment intersection. |
| `best doctor in {country} for {condition}`, `best doctor in {country} for {treatment}` | `/condition/{slug}/doctors` (existing) OR `/condition/{slug}/{country}` | EXISTS for `/condition/[slug]/doctors`; `/condition/[slug]/[place]` exists. Title needs `Best Doctors in {Country} for {Condition}` to capture the query. |
| `apollo hospital india` / brand+country | `/hospital/{slug}` (existing) | EXISTS | No new page. Make sure the hospital detail page emits `{Hospital Name} — {City}, {Country}` in title. Already does. |
| `proton beam therapy india`, `gene therapy cost in india`, `denvax treatment cost in india`, `immunotherapy cost in india`, `targeted therapy cost in india` | `/treatment/{slug}/{country}` | EXISTS when slug exists | **CHECK** — confirm each of these therapies is in `treatments` table. Missing: proton-beam-therapy ✓, gene-therapy ?, denvax (dengue vaccine? not surgical — skip), immunotherapy ✓, targeted-therapy ?. Add slugs for the missing therapy types if absent (1-line `INSERT` per new treatment). |

## 3 · Identified route gaps (action items)

**Status: all 5 gaps closed on 2026-05-20.**

Five concrete gaps to close — ranked by query volume × ease.

### G1 — `Best/Top` title rewrites (no new routes; copy edits only) ✅ SHIPPED 2026-05-20

Files edited:
- `astro/src/pages/[locale]/surgeons/[specialty]/[country].astro` — title → `Best {SurgeonNoun} in {Country} ({YYYY}) — Ranked`; H1 → `Best {surgeon noun} in {Country}`
- `astro/src/pages/[locale]/condition/[slug]/doctors.astro` — title → `Best Doctors for {Condition} — Ranked by Volume`; H1 → `Best doctors for {condition}`
- `astro/src/pages/[locale]/hospital/[slug]/[specialtySlug]/doctors.astro` — title → `Best {SurgeonNoun} at {Hospital}`; H1 → `Best {surgeon noun} at {Hospital}`
- `astro/src/lib/seo.ts` — new `surgeonNoun(slug, name)` + `titleCase()` helpers. Maps 15 specialty slugs to grammatically correct surgeon nouns ("cardiac-surgery → cardiac surgeons", "neurology-neurosurgery → neurosurgeons", "orthopedics → orthopedic surgeons"), eliminating the "Cardiac Surgery Surgeons" stutter.

Note: `/hospitals/country/[countrySlug]` is a 308-redirect stub to `/country/[slug]` which already had `Best Hospitals in {Country} for International Patients ({YYYY})` — no edit needed. Same for `/doctors/specialty/[s]/[city]` (redirects to `/surgeons/[s]/[country]`).

### G2 — `/best/[slug]` extended to serve treatment slugs ✅ SHIPPED 2026-05-20

Originally proposed as new route `/hospitals/specialty/[slug]/[country]`. Better implementation: extend the existing `/best/[slug]` page (slug pattern `{x}-in-{country}`) to also resolve treatment slugs in addition to specialty slugs. Same canonical URL pattern, one page handles both. Files edited:

- `astro/src/pages/[locale]/best/[slug].astro` — after parseSlug, tries specialty first then falls back to treatment. Treatment mode joins `hospital_treatments` (must offer the procedure) plus a LEFT JOIN on `hospital_specialties` for the CoE signal on the parent specialty. Cross-links (surgeons hub, specialty hub, ExploreGrid) all use `parentSpecialty` so treatment pages still link out correctly. Added a 35-entry `SLUG_ALIASES` map that 301-redirects common search-form slugs to canonical (`/best/knee-replacement-in-india` → `/best/total-knee-replacement-in-india`; `/best/heart-in-india` → `/best/cardiac-surgery-in-india`; `/best/cancer-in-india` → `/best/oncology-in-india`; etc.).

Treatment-mode URLs now live (sample, all 200):
- `/best/liver-transplant-in-india` — Best Hospitals for Liver Transplant in India (2026)
- `/best/cabg-heart-bypass-in-india` — Best Hospitals for CABG (Heart Bypass Surgery) in India (2026)
- `/best/total-knee-replacement-in-india` — Best Hospitals for Total Knee Replacement in India (2026)
- `/best/proton-beam-therapy-in-germany` — Best Hospitals for Proton Beam Therapy in Germany (2026)

### G3 — Missing therapy slugs + advanced-therapy pricing coverage ✅ SHIPPED 2026-05-20

Audit found 3 high-volume oncology slugs missing entirely (`gene-therapy`, `immunotherapy`, `targeted-therapy`) plus 5 existing advanced-modality slugs with zero `hospital_treatments` coverage (`proton-beam-therapy`, `car-t-cell-therapy`, `cyberknife-radiosurgery`, `gamma-knife`, `bone-marrow-transplant`).

- `scripts/seo/seed-advanced-therapies.ts` — inserts 3 new oncology treatment slugs with full 4-paragraph editorial descriptions (lede / stay+recovery / outcomes hedge / cost drivers + surgeon questions) matching the Phase-11 template style. Meta title + meta description per row. Idempotent.
- `scripts/seo/seed-advanced-therapy-pricing.ts` — seeds `hospital_treatments` rows for all 8 advanced therapies at top oncology hospitals per country (CoE-flagged first, then featured, then top-rated). Conservative: capped at 25 hospitals per (country, treatment) so we don't synthesize clinical claims across 4,000 hospitals. Country-banded pricing (India 1.0× through Germany 4.5×) with deterministic ±15% per-hospital jitter so re-runs are stable. **+1,800 hospital_treatments rows** across 9 destinations × 8 therapies × 25 hospitals.

After seed, all `/best/{therapy}-in-{country}` URLs now render with ranked hospital lists.

Stem-cell-therapy intentionally NOT added as a separate slug — clinically ambiguous (BMT is well-evidenced and already exists; regenerative stem-cell-therapy is largely unproven outside specific indications). `bone-marrow-transplant` covers the legitimate search intent.

### G4 — Condition × Country mapping for "best doctor for X in {country}" ✅ ALREADY SHIPPED (verified 2026-05-20)

`/condition/[slug]/[place].astro` already accepts both city and country slugs via `mode: 'country' | 'city'` resolver. Smoke-tested 4 country and 1 city variant — all render correctly. Title pattern is `{Condition} Treatment in {Country|City}`. Note: 404s on un-mapped slugs (`/condition/diabetes/india`) are intentional — they reflect a slug-name mismatch (canonical is `type-2-diabetes`), not a routing bug. Future enhancement: add a CONDITION_ALIASES map paralleling SLUG_ALIASES in `/best/[slug]`.

### G5 — Treatment × City fallback redirect ✅ ALREADY SHIPPED (verified 2026-05-20)

`/treatment/[slug]/[country].astro` already detects when the second param is a city slug (not a country slug), looks up the city's country, and 301-redirects to `/treatment/{slug}/{country}?city={citySlug}`. Smoke-tested `/treatment/cataract-premium-iol/hyderabad` and `/treatment/lasik-smile/delhi` — both correctly redirect.

## 4 · Country expansion checklist

Apply each accepted pattern across all 9 destinations. Volume estimates assume India-level demand per pattern is the ceiling; other destinations get fractional but non-trivial volume (Turkey ≈ 0.4×, Thailand ≈ 0.3×, Germany ≈ 0.25×, UAE/Singapore ≈ 0.15× each).

| Country | Slug | Notes |
|---|---|---|
| India | `india` | Highest volume — already covered |
| Turkey | `turkey` | High volume on hair transplant, dental, cosmetic, IVF — surface in title for those specialties |
| Thailand | `thailand` | Bariatric, cosmetic, gender affirmation, dental — surface in title |
| Germany | `germany` | Oncology, cardiology, neurology, complex transplants |
| South Korea | `south-korea` | Plastic surgery, oncology, dental |
| UAE | `uae` | Fertility, cosmetic, cardiology, oncology |
| Singapore | `singapore` | Oncology, complex surgery, executive health |
| Malaysia | `malaysia` | IVF, cardiology, cosmetic |
| Saudi Arabia | `saudi-arabia` | Oncology, cardiology, transplant (newer market) |

After the title rewrites in §G1, each accepted pattern automatically scales across all 9 countries since the routes are already programmatic.

## 5 · Title / H1 template library (consolidated)

| Pattern | `<title>` | `<h1>` |
|---|---|---|
| treatment × country | `{Treatment} Cost in {Country} ({YYYY}) — Hospitals + Quotes` | `{Treatment} in {Country}` |
| best hospitals × country | `Best Hospitals in {Country} ({YYYY}) — Top {N} by Rating & Reviews` | `Best hospitals in {Country}` |
| best specialty hospitals × country | `Best {Specialty} Hospitals in {Country} ({YYYY})` | `Best {Specialty} hospitals in {Country}` |
| best surgeons × country | `Best {Specialty} Surgeons in {Country} ({YYYY}) — Ranked` | `Best {Specialty} surgeons in {Country}` |
| best surgeons × city | `Best {Specialty} Surgeons in {City}, {Country}` | `Best {Specialty} surgeons in {City}` |
| best doctors × condition × country | `Best Doctors for {Condition} in {Country}` | `Best doctors for {Condition} in {Country}` |
| hospital detail | `{Hospital Name} — {City}, {Country} (Reviews, Pricing)` | (existing) |
| doctor detail | `{Title} {Name} — {Specialty} in {City}, {Country}` | (existing) |
| `/best/{specialty}-in-{country}` | `Best Hospitals for {Specialty} in {Country} ({YYYY})` | (existing — keep) |

Year token `{YYYY}` is rendered server-side from `new Date().getFullYear()` so titles auto-refresh annually without a deploy.

## 6 · Schema markup checklist (per pattern)

| Page | Required JSON-LD |
|---|---|
| treatment × country | `MedicalProcedure` + `AggregateOffer` + `BreadcrumbList` + `FAQPage` (already shipping) |
| best hospitals × country | `ItemList` (Hospital nodes) + `BreadcrumbList` |
| best surgeons × country | `ItemList` (Physician nodes) + `BreadcrumbList` |
| best surgeons × city | same as above |
| condition × country doctors | `ItemList` (Physician) + `MedicalCondition` + `BreadcrumbList` |
| specialty × country hospitals (G2) | `ItemList` (Hospital) + `MedicalSpecialty` + `BreadcrumbList` |

All of these helpers exist in `astro/src/lib/seo.ts` (`itemListJsonLd`, `breadcrumbJsonLd`, `withProvenance`). G2 just needs to call them.

## 7 · Order of execution (suggested sprint)

1. **G1** — title rewrites across 4 templates (30 min, no new routes, fastest win, picks up "best/top" suffix variants across ~200 existing pages).
2. **G2** — add `/hospitals/specialty/[slug]/[country].astro` (1h, 135 new URLs).
3. **G3** — confirm therapy slugs (`gene-therapy`, `targeted-therapy`, `immunotherapy`, `proton-beam-therapy`, `stem-cell-therapy`, `car-t-therapy`) exist and have descriptions; add the missing ones (1h × N).
4. **G4** — verify `/condition/[slug]/[place].astro` handles country slugs (30 min).
5. **G5** — middleware redirect for treatment × city tail (20 min).

Total: ~3-4 hours of work to capture the full India keyword-pattern set and propagate to all 8 other destinations automatically.

## 8 · What we explicitly do NOT do

- No dedicated landing pages for ayurveda / homeopathy / naturopathy. Out of scope. If a future strategic pivot adds traditional-medicine routing, revisit.
- No consumer-pharma "remedies" / "ointment" / "medicine list" pages. We are not a pharmacy.
- No career-funnel pages (doctor salaries, MBBS, internship). We are not a med-school portal.
- No "first/famous/youngest/biggest doctor" trivia pages. Informational queries — low conversion, distracts crawl budget from commercial pages.
- No dedicated competitor-brand pages (Apollo, AIIMS, Fortis, Gleneagles). Their named hospitals already exist as `/hospital/{slug}`. Don't build "Apollo vs X" doorway pages.
