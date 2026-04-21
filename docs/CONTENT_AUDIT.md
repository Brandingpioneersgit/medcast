# MedCasts — Site Audit: Content, Media, Pages

Audited 2026-04-20. Site = Astro (public) + Next.js (admin).
Live DB state + route inventory below. Target: parity with Claude Design handoff + true medical-tourism SEO depth.

---

## TL;DR — what needs work, ranked

| Priority | Area | Status | Effort |
|---|---|---|---|
| P0 | Hospital cover images (86% of 9,254 have no photo) | Script-able | 1 day |
| P0 | Hospital accreditations (only 6/9,254 rows) | Needs data import | 2 days |
| P0 | Visa content (table doesn't exist; pages hardcode) | Build table + seed 9 rows | 1 day |
| P0 | Hospital-detail page redesign (design handoff) | Layout rebuild | 1 day |
| P0 | Treatment-detail page redesign + pricing sidebar | Layout rebuild | 1 day |
| P1 | Doctor bios deep-enrich + photo coverage (17%→60%+) | Script + sourcing | 2 days |
| P1 | Testimonials expansion (5→30+, link to treatments, add photos) | DB + content | 1 day |
| P1 | Quote wizard flow (design page, not yet in Astro) | New page | 1 day |
| P1 | Hospital gallery (table empty; design shows gallery) | Data + UI | 1 day |
| P1 | Country page long-form content (no DB column) | Schema + seed | 1 day |
| P1 | Hospital FAQs (0 seeded) | Script | 0.5 day |
| P2 | Condition FAQs (0 seeded) | Script | 0.5 day |
| P2 | Blog expansion (10→30+ posts) | Content | 3 days |
| P2 | ⌘K command palette (design has it) | New component | 0.5 day |
| P2 | Patient portal + referral in Astro (Next-only) | Port | 1 day |
| P2 | Glossary, QA, gallery, best-of pages (Next-only) | Port as needed | 2 days |
| P3 | AR/RU/FR/PT/BN/TR/HI translations (OpenRouter credits needed) | QStash run | — |

---

## 1 · Current page inventory (Astro)

### Built and live (41 public routes)

#### Core SEO pages
- `/` — **home** (✅ design-aligned Phase 12)
- `/hospital/[slug]` — hospital detail — **design mismatch** (P0)
- `/hospital/[slug]/[specialtySlug]` — hospital × specialty (key 45,000-URL fan-out)
- `/treatment/[slug]` — treatment detail — **design mismatch** (P0)
- `/specialty/[slug]` — specialty hub
- `/condition/[slug]` — condition hub
- `/doctor/[slug]` — doctor detail — **design mismatch** (P0)
- `/country/[slug]` — destination hub
- `/city/[slug]` — city hub
- `/cost/[slug]` — cost-of-treatment page
- `/visa/[slug]` — visa guide — **content hardcoded, no DB**

#### Listings + filters
- `/hospitals` (with country + specialty filter rail, pagination) — **closest to design**
- `/doctors`, `/doctors/specialty/[s]`, `/doctors/specialty/[s]/[city]`, `/doctors/city/[c]`, `/doctors/country/[c]`
- `/hospitals/city/[c]`, `/hospitals/country/[c]`, `/hospitals/specialty/[s]`
- `/treatments`, `/treatments/country/[c]`
- `/specialties`, `/conditions`, `/countries`

#### Info / conversion
- `/about`, `/editorial-policy`, `/contact`, `/for-hospitals`
- `/second-opinion`, `/emergency`, `/insurance`
- `/calculator` (cost calculator)
- `/compare/countries`, `/compare/treatments`
- `/blog`, `/blog/[slug]`

#### SEO infrastructure
- 12 sitemap files (countries, cities, conditions, costs, doctors, hospital-specialties, hospitals, specialties, treatments, visas, blog, static)
- `robots.txt`, `404`, `500`, `og` image route

### Missing in Astro — still Next-only
| Route | Priority | Notes |
|---|---|---|
| `/journey/[code]` | P2 | Patient journey tracker — functional, low SEO |
| `/portal` + `/portal/[code]` | P2 | Patient portal lookup — functional |
| `/referral` | P2 | Referral flow |
| `/accreditation` + `/accreditation/[code]` | P1 | Accreditation hub (JCI, NABH) — real SEO value |
| `/best/[slug]` | P1 | "Best hospitals for X" programmatic — real SEO value |
| `/compare/doctors`, `/compare/hospitals` | P2 | Only countries + treatments in Astro |
| `/gallery` | P2 | Facility gallery — needs images first |
| `/glossary` + `/glossary/[term]` | P3 | Medical term glossary — long-tail SEO |
| `/qa` + `/qa/[slug]` | P3 | Q&A hub |
| `/services/[kind]` | P3 | Services by type — thin |
| `/find-specialist` | P2 | Matching flow |
| `/treatment/[slug]/[country]` | P0 | Cost-in-country page — high SEO value, currently Next-only |
| `/privacy-policy`, `/terms` | P1 | Required legal pages |
| `/sitemap-browse` | P3 | Human-browsable sitemap — low SEO |

### Missing from both — design specified, not yet built
| Page | From design | Priority | Notes |
|---|---|---|---|
| **Quote wizard** | `page-flows.jsx` | P1 | Multi-step quote request form. `/contact` is the closest analog. |
| **Patient portal (rich UI)** | `page-flows.jsx` | P2 | Lookup → journey timeline |
| **⌘K command palette** | `SiteHeader` | P2 | Search overlay (API exists: `/api/v1/search` on Next) |
| **Doctor-treatment combo page** | `page-doctor-treatment.jsx` | P2 | Doctor + treatment pricing mashup |

---

## 2 · Content quality by entity

### Hospitals — **9,254 active**
| Metric | Count | % |
|---|---|---|
| Total active | 9,254 | 100% |
| Rich description (≥500 char) | 1,647 | 18% |
| Cover image | 1,273 | 14% |
| **Gallery images (hospital_images table)** | **0** | **0%** |
| **Accreditation rows linked** | **6** | **<1%** |
| Specialty map rows | 9,254 | 100% |
| Treatment pricing rows | 9,254 | 100% |
| Featured for home | 4 | 0.04% |

**Gaps**:
- **P0** — 8,981 hospitals without accreditation data. Design hero cards show "JCI · NABH" chips. Currently only 6 flagship hospitals pass this. Need bulk accreditation import from OpenData sources (MoHFW India, MOH Turkey, JCI registry).
- **P0** — 86% of hospitals have no cover image. Fallback helper keeps UI functional via country-keyed Unsplash, but a real medical-tourism site needs per-hospital exterior/interior photography.
- **P1** — Hospital descriptions are templated (Phase 9c). Top 100 hospitals need hand-written editorial copy with surgeon names + specific program highlights.
- **P1** — Gallery empty. Per-hospital 3-5 photos (exterior, atrium, OR, patient room) would unlock a proper detail page.

### Doctors — **847 active**
| Metric | Count | % |
|---|---|---|
| Total active | 847 | 100% |
| Rich bio (≥300 char) | 128 | 15% |
| Photo | 146 | 17% |
| Qualifications field | 10 | 1% |
| Cal.com URL | 0 | 0% |
| Specialty mapping | 10 | 1% |

**Gaps**:
- **P0** — 837 doctors have no specialty mapping, so they don't appear on specialty/treatment pages. Doctors index shows 847 but specialty pages only surface 10. Bulk specialty mapping script required.
- **P1** — Qualifications field populated on only 10 — needed for credibility (MBBS, MD, FRCS).
- **P1** — Photos: 17%. Need sourced headshots for the top ~50 surgeons across specialties.
- **P2** — Cal.com booking: 0 connected. Design implies "Speak to the surgeon" step — requires wiring.
- Per specialty, doctor coverage:
  - Cardiac 3, Oncology 3, Ortho 2 — each
  - Neuro 1, GI 1
  - **Dental 0, Bariatric 0, Urology 0, Gynae 0, ENT 0, Pediatric 0, Transplant 0, Cosmetic 0, Fertility 0, Ophthalmology 0**
  - → Specialty hub pages have no doctor cards for 10 of 15 specialties

### Treatments — 88 active
| Metric | Count | % |
|---|---|---|
| Rich description | 80 | 91% |
| metaTitle + metaDescription | 80 | 91% |
| Has FAQs | 88 | 100% ✅ |
| Has pricing rows | 33 | 38% |

**Gaps**:
- **P1** — Only 33 treatments have `hospital_treatments` pricing rows tied to real hospitals, so the `/cost/[slug]/[country]` programmatic fan-out is thin for 55 treatments. Phase 9 seeding ran on 88 but filtered.
- Remaining 8 one-liners are pre-templated Wikipedia rows (preserved).

### Specialties — 15 active
- All 15 hand-curated rich descriptions ✅
- All 15 have FAQs (75 rows) ✅
- Still missing: specialty icon/hero image (design has specialty-specific imagery)

### Conditions — 79
- 78/79 rich descriptions ✅
- **0 FAQs** — P2 gap. Would add FAQPage schema to all 79 condition pages.
- No condition-specific hero image.

### Countries — 9 destinations
- **No `description` column in DB** — country pages hardcode intros from a lookup map. For future self-serve content editing (or AI translator) a `description` column is needed.
- No per-country hero image (using Unsplash fallback)
- No per-country "why here" + pricing summary + caveats content rows
- `visa_info_url` column exists but unused; **no `visa_info` table**

### Cities — 2,259 with active hospitals
- Only 1,270 geo-enriched (Nominatim pass)
- No per-city description; cities index is thin
- Some cities still named "Unknown" from bulk import

### Blog — 10 published
- Strong editorial quality (~2,400 char avg, all with reviewer bylines)
- Categories: Cost comparisons (2), Second opinions (2), Guides (1), Visa (1), Fertility (1), Bariatric (1), Planning (1), Destinations (1)
- **Gap**: Only 1 post per category on most. Need 3-5× more posts for topical authority:
  - Cardiac: 0 (should have CABG recovery, valve types, when to fly home post-op)
  - Orthopedic: 0 (should have knee revision, spine post-op flight, hip dislocation risk)
  - Oncology: 1 (need chemo abroad, proton therapy, BMT logistics, clinical trials)
  - Neuro: 0 (awake craniotomy, DBS travel, epilepsy surgery workup)
  - Pediatric: 0 (PICU abroad, pediatric congenital heart)
  - Transplant: 0 (living-donor workup, post-op year-one management)
  - Insurance/payment: 1 (need FX, escrow, crypto-payment, refunds)

### Testimonials — 5
- All 5 are featured ✅
- 0 have image, 0 have video, 0 linked to specific treatment
- **Gap**: 5 is too few for testimonial-carousel depth. Need 30+ across the 15 specialties. Real patient quotes or at least interview-style case studies.

### FAQs — 603 total
| Entity | Rows | Coverage |
|---|---|---|
| treatment | 528 | 88/88 ✅ |
| specialty | 75 | 15/15 ✅ |
| **hospital** | **0** | **0/9,254** |
| **condition** | **0** | **0/79** |
| hospital_specialty | 0 | |
| country | 0 | 0/9 |

**Gaps**:
- **P1** — condition FAQs (~5 × 79 = 395 rows) — adds FAQPage schema to 79 pages
- **P2** — top-100 hospital FAQs (~5 × 100 = 500 rows) — covers featured + top-rated; doing all 9,254 is overkill
- **P1** — country FAQs (~6 × 9 = 54 rows) — visa + payment + follow-up + language

### Translations
| Locale | Hospital rows | Treatment | Specialty | Condition | Blog |
|---|---|---|---|---|---|
| ar, bn, fr, hi, pt, tr | 549 | 0 | 0 | 0 | 0 |
| ru | 552 | 0 | 0 | 0 | 0 |
| **Total** | **~3,846** | 0 | 0 | 0 | 0 |

**Gap**: Only ~18% of hospitals translated. Treatments, specialties, conditions, blog — **zero translations** across all 7 non-English locales. OpenRouter credits needed to run the `scripts/import/translate-hospitals.ts` pipeline against the Phase 11 content. Temporary: `isUntranslated()` flag on pages noindex untranslated locales so Google doesn't see duplicate English content at `/hi/treatment/...`.

---

## 3 · Media audit

| Asset type | Current | Need | Source |
|---|---|---|---|
| Hospital cover photos | 14% (1,273 / 9,254) | 60%+ on top 500 | Vendor hospital press kits + licensed stock |
| Hospital gallery | 0 rows | 5 photos × top 500 | Same sourcing |
| Doctor headshots | 17% (146 / 847) | 60%+ on top 100 | Hospital media kit; Wikipedia CC on notable |
| Testimonial photos | 0% | Top 10 with real photos or consented stock | Paid session or stock |
| Country hero photos | Unsplash fallback | Licensed editorial photos per 9 destinations | Unsplash+ or commissioned |
| Specialty hero photos | None | 15 editorial medical photos | Same |
| Condition hero photos | None | Top-20 only | Same |
| Blog post cover photos | None populated | 1 per post × 10 | Unsplash licensed |
| OG images | Dynamic via `/og` route ✅ | — | ok |
| Favicon / PWA icons | Static SVG ✅ | Real brand mark PNG set | After brand approved |

### Media wins we should not lose
- `/api/og` dynamic OG image works — don't break
- Unsplash country-keyed fallback unlocks visual coverage without licensing cost
- `hospital_images` table exists in schema, just unpopulated

---

## 4 · New pages to build

Ranked by impact × buildability.

### P0 — Must build for design parity and SEO core
| Page | Path (Astro) | Why |
|---|---|---|
| Hospital detail v2 | `/hospital/[slug]` (redesign) | Current layout doesn't match design's 1.5:1 hero + sticky quote panel |
| Treatment detail v2 | `/treatment/[slug]` (redesign) | Missing price-by-country sidebar + hospital ranking table with real design |
| Doctor detail v2 | `/doctor/[slug]` (redesign) | Design shows Cal.com booking, timeline, specialty tags in editorial style |
| Treatment × country cost | `/treatment/[slug]/[country]` | **Not in Astro yet.** Next-only. Highest-SEO programmatic fan-out (88 × 9 = 792 URLs) |
| Visa detail v2 | `/visa/[slug]` (redesign) | Currently renders hardcoded content. Needs DB-backed `visa_info` table |

### P1 — SEO depth + conversion
| Page | Path (Astro) | Why |
|---|---|---|
| Accreditation hub | `/accreditation/[code]` | "JCI hospitals in India" etc. Real SEO intent match |
| Best-of hubs | `/best/[slug]` | Programmatic "best X for Y" — long-tail traffic |
| Quote wizard | `/quote` | Design specifies multi-step; `/contact` is too flat |
| Compare hospitals | `/compare/hospitals` | Parity with compare/treatments + compare/countries |
| Compare doctors | `/compare/doctors` | Same |
| Privacy policy | `/privacy-policy` | Required for GDPR + analytics consent |
| Terms of service | `/terms` | Required |
| Surgeon-volume page | `/treatment/[slug]/top-surgeons` | Data-driven: doctors with highest case count for this treatment |

### P2 — Content depth + long-tail
| Page | Path (Astro) | Why |
|---|---|---|
| Patient portal | `/portal` + `/portal/[code]` | Port from Next — functional page, low SEO |
| Referral | `/referral` | Port from Next |
| Find-specialist flow | `/find-specialist` | Matching wizard |
| Glossary | `/glossary` + `/glossary/[term]` | Long-tail medical terminology |
| Q&A hub | `/qa` + `/qa/[slug]` | User-submitted questions answered by panel |
| Journey tracker | `/journey/[code]` | Port functional page |
| Gallery | `/gallery` | Blocked on hospital photo sourcing |
| Services | `/services/[kind]` | 5-8 services — airport pickup, interpreter, accommodation, rehab |
| Sitemap browse | `/sitemap-browse` | Human-browsable |

### P3 — Nice-to-have
| Page | Priority | Why |
|---|---|---|
| Press / media | P3 | When there's press to link |
| Careers | P3 | Only if hiring |
| Medical panel | P3 | Could be a subpage of `/about` |
| Blog category archive | `/blog/category/[c]` | Currently no category filter on blog index |
| Blog tag archive | `/blog/tag/[t]` | Same |
| Medical director profiles | `/panel/[slug]` | Individual panel member pages |

---

## 5 · Data-layer work (schema + seed scripts)

Ordered by unlock value.

1. **`visa_info` table** — columns: `country_id`, `visa_required`, `processing_time`, `overview`, `requirements`, `escort_allowed`, `extension_possible`, `embassy_url`. Seed 9 rows (one per destination) with real content. Unlocks `/visa/[slug]` to be editable without code change.
2. **`countries.description`** — add `description TEXT`, seed per-country editorial content (currently lives in a TS lookup map). Unlocks translation pipeline for country content.
3. **`countries.hero_image_url`** — add column, seed with licensed editorial photo URLs. Unlocks per-country hero image instead of Unsplash fallback.
4. **`specialties.hero_image_url` + `conditions.hero_image_url`** — same pattern.
5. **`hospitals.accreditations`** bulk import — sourcing: MoHFW (India), MoH (Turkey), JCI registry, NABH registry. 8,981 rows to reconcile.
6. **Doctor specialty mapping script** — heuristic on doctor name + hospital specialty rosters to backfill `doctor_specialties` for the 837 orphan doctors.
7. **Seed condition FAQs** — 5 × 79 = 395 rows, templated similar to treatment FAQs.
8. **Seed top-100 hospital FAQs** — 5 × 100 = 500 rows.
9. **Seed country FAQs** — 6 × 9 = 54 rows.
10. **Testimonials expansion** — seed 30+ from real case files (or case study interviews) with links to specific treatments.
11. **`blog_posts.cover_image_url`** — seed top 10 with licensed Unsplash URLs.
12. **Glossary table** — `medical_terms` (slug, term, definition, related_condition_ids, related_treatment_ids). Seed 100 terms.
13. **Q&A table** — `qa_posts` (slug, question, answer, author, reviewed_by, category). Seed 50.

---

## 6 · Component work (design handoff gaps)

Components in the design we don't have in Astro:
- **⌘K command palette** (kbd shortcut exists visually in header but no overlay backing it)
- **Sticky quote panel** (right rail of hospital detail)
- **Price-by-country bar chart** (treatment detail sidebar)
- **Flag component** (emoji-based, fine as is)
- **Stars sparkline** (have inline; could be shared atom)
- **Headshot monogram** (have inline; could be shared atom)
- **Filter rail drawer** (mobile)
- **Mobile sticky footer CTA** (quote-me bar on scroll)

---

## 7 · Proposed build order (next 2 weeks)

**Week 1 — design parity + high-leverage content**
- Day 1: Hospital detail v2 (redesign layout to match design: 1.5:1 hero + sticky quote panel + accreditation chips + 21/9 photo + 4-up stats)
- Day 2: Treatment detail v2 (price-by-country bar chart + ranked hospitals + inclusions/exclusions + FAQ at bottom)
- Day 3: Doctor detail v2 (design layout + Cal.com integration stub)
- Day 4: `/treatment/[slug]/[country]` port to Astro + seed pricing rows
- Day 5: `visa_info` table + seed 9 rows + redesign `/visa/[slug]`

**Week 2 — content + conversion flows**
- Day 6: Quote wizard multi-step page (design layout) + hook up to `/api/v1/inquiry`
- Day 7: Accreditation hub `/accreditation/[code]` + bulk accreditation import for top-500 hospitals
- Day 8: Condition FAQs seed + country FAQs seed (395+54 rows)
- Day 9: Testimonials expansion (30 rows seed, linked to treatments) + testimonial carousel polish
- Day 10: Blog 10 more posts (cardiac, oncology, neuro, pediatric, insurance-payment)

**Week 3 (deferred) — translations + media**
- OpenRouter translation run (needs credits)
- Photo sourcing pass (top 100 hospitals, top 50 doctors)
- Privacy + Terms pages

---

## 8 · Known non-blockers (monitor but don't fix yet)

- 2,259 cities with hospitals but no city-level description — individual city pages are thin but not critical
- 837 orphan doctors floating without specialty — visible only on `/doctors` index, blocked from specialty hubs (see P0 fix)
- `has_gallery = 0` — design's hospital detail shows 2-up thumbnails. Currently renders only the main image — no visual regression, just less rich
- Blog category filter doesn't exist — low-traffic risk since only 10 posts
- `privacy-policy` + `terms` not ported — legal must-have before production launch
