# Changelog

Notable improvements landed in this session.

## 2026-05-04 → 2026-05-05 — Hardening + perf + SEO sweep

### Performance
- **Parallelized DB queries** on home, hospital, treatment, specialty, doctor pages. Cold TTFB on home: 5.2s → 1.5s (−71%).
- **6 composite indexes** added to Supabase (`idx_ht_treatment_cost`, `idx_doctor_specialties_spec`, `idx_hospital_specialties_spec`, `idx_doctor_active_featured_rating`, `idx_hospital_active_rating`, `idx_hospital_featured_rating`). EXPLAIN ANALYZE shows `MIN(cost) WHERE treatment_id` is now an Index Only Scan in **0.097ms**.
- **Connection pool** dropped from `max: 10` to `max: 3` for Cloudflare Worker isolates; `prepare: false` for PgBouncer compatibility.
- **Server-Timing** header on every response (`Server-Timing: total;dur=NNN`).
- **DNS prefetch** hints for GTM / GA / Sentry / Cloudinary.
- **Service worker v3** — stale-while-revalidate HTML, cache-first hash assets, SWR Unsplash with 60-entry trim. `/[locale]/offline` fallback. Prod-only registration.
- **Viewport prefetch** on home destination tiles + featured hospital cards.
- **Critical font preload** verified (Fraunces + Inter latin-400).
- **Skeleton loaders** on `QuoteCalculator` + `MatchMe` while `/api/v1/estimate` resolves.

### Security
- **HMAC-signed admin sessions.** Pre-fix, "tokens" were base64 JSON with no signature — anyone could forge an admin session. Now SHA-256 HMAC w/ constant-time compare; throws on prod boot if `NEXTAUTH_SECRET` is unset.
- **CSRF guard** + per-IP **rate limit** on all 4 public POST endpoints (`/api/v1/quote-request`, `/api/v1/referral`, `/api/subscribe`, `/api/v1/quote-draft`).
- **Honeypot** field in `ContactDoctor`, `MatchMe`, `QuoteCalculator` + server-side drop on tripped honeypot. Verified: bot vs human POST.
- **Sentry PII redaction** + replay masking. `sendDefaultPii: false`; `beforeSend` scrubs `message`/`notes`/`body`/`email`/`phone`/`dob`/`passport`; replay masks all text + inputs + media.
- **Search input sanitization** — `globalSearch` LIKE wildcards (`%`, `_`) now backslash-escaped; query capped at 100 chars; 200 + empty results on DB error (was leaking 500).
- **Audit log table** created (was declared in Drizzle schema but **never migrated** — every `recordAudit` since launch had been silently swallowed). Now wired into hospital, doctor, treatment routes.
- **Compare basket localStorage** hardened — slug whitelist regex + de-dupe + cap on both load and save.
- **Sanitizer** for blog HTML (`sanitizeBlogHtml`) — strips `<script>`/`<iframe>`/`javascript:`/`on*=` handlers via allowlist tag set.
- **Security headers**: HSTS (2y, includeSubDomains, preload-ready), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-Permitted-Cross-Domain-Policies`.
- **CSP Report-Only** with `report-uri /api/csp-report` + Reporting-Endpoints header. Endpoint dedups browser-extension noise, rate-limits 60/min/IP.
- **R2 patient-report download URL TTL** dropped from 7d to 24h. Re-presign on access.
- **Bcrypt rounds** seed bumped 10 → 12.
- **Admin session cookie** `sameSite: lax → strict`.
- `/.well-known/security.txt` + `/security` page (responsible disclosure policy).

### SEO
- **JSON-LD enrichment**: Hospital `priceRange` + `openingHoursSpecification` + `paymentAccepted` + `currenciesAccepted` + Wikidata/Wikipedia `sameAs`. MedicalProcedure `expectedPrognosis` + `followup`. Article `reviewedBy` parses "Reviewed by Dr. X" → Person; doctor lookup by last-name match links to `/doctor/<slug>` when found. Speakable on blog. `withProvenance()` (dateModified + reviewer + dateCreated) wrapping country + treatment-country pages.
- **Wikidata sameAs backfill** — 224 hospitals matched (44 + 180) on first project; ready to backfill new project.
- **Sitemaps**: `<lastmod>` added to best/costs/treatments-cities/hospital-specialties (60,500+ entries now carry timestamps). New `/sitemap-news.xml` (Google News, last 48h) and `/sitemap-images.xml` (5k hospitals × cover photos).
- **CSP-clean JSON-LD** — bulk-added `is:inline` to 120 `<script type="application/ld+json">` tags across 60 files. `astro check` hints 176 → 56.
- **JSON-LD smoke test** in CI — 11 routes, 48 blocks validated, fails on missing `@context` / required-by-Google fields.
- **noindex** on untranslated content (qa, glossary, accreditation) for non-en locales.
- **Robots.txt** rewritten — full disallow set + AI-bot allows (GPTBot, Google-Extended, PerplexityBot, CCBot) + 19 sitemap declarations.
- **Pagination canonical** verified — paginated listings noindex `?page > 1` + canonical to page 1.
- **OG**: dynamic SVG card at `/og?title=...` (no Satori bundle); blog Article OG tags (`article:published_time`, `author`, `section`).
- **IndexNow** scaffold — key file at `/<KEY>.txt`; helper `pingIndexNow(urls[])` for fire-and-forget on publish.
- **`llms.txt`** verified live.

### UX & A11y
- **Skip-to-content** link (`<a href="#main">`) on every page; bulk-added `id="main"` to all 66 `<main>` tags.
- **Print styles** (`@media print`) — drop chrome, force ink-on-white, A4 page geometry, link URLs in parens.
- **Email-me-this-list** + Copy-link CTAs on `/compare/hospitals`. Mailto with formatted body + clipboard fallback.
- **Compare basket cap toast** — flashes "Max 4 hospitals" when 5th add attempted.
- **WhatsApp fallback** in FAB — visible "No WhatsApp? Email us" line.
- **Form validation** (client-side) on `ContactDoctor`, `MatchMe`, `QuoteCalculator` — friendly error messages before server round-trip.
- **Honest reply-time copy** — replaced 23 hardcoded "9 min" / "11 min" claims across 13 files with truthful "during business hours" phrasing.
- **404 search CTA** — opens command palette; ⌘K hint.
- **500 page trace ID** — reads `cf-ray` (Cloudflare) or generates a timestamp id; mailto pre-fills the reference.
- **"In the news"** aside on hospital detail pages — surfaces 19,388 imported `hospital_news` rows that had been unused.

### Code health
- **Zod-style locale validator** — boot-time structural check across 7 non-default locales catches drift, never throws (falls back to `en`). **Caught real drift on first run** (`hero.stats` type mismatch in 5 locales — turned out to be too-strict initial validator; tightened).
- **CSP report endpoint** at `/api/csp-report` (legacy + Reporting API).
- **`/api/health`** probe (DB ping + ms timing).
- **Pre-commit hook** at `.husky/pre-commit` — runs `astro check` for staged Astro changes, `tsc` for staged Next changes.
- **ESLint flat config** for Astro side (`@astrojs/check` + jsx-a11y on `.tsx`).
- **Lighthouse-CI workflow** — perf budget gate in CI (a11y ≥0.9, SEO ≥0.95, best-practices ≥0.85).
- **RowMapper helper** + lead-form-utils + KV-backed rate-limiter (`rateLimitKv`).
- **`.mc-container` motif extraction** — replaces a 92-occurrence `mx-auto w-full max-w-[80rem] px-5 md:px-8` pattern.
- **Color literals → CSS vars** sweep — 18 hardcoded hexes replaced; meta `theme-color` left as literal hex (browsers reject `var()`).
- **File naming audit** — 0 issues (PascalCase components, kebab-case routes).
- **Drizzle schema drift check** — `drizzle-kit check` clean.
- **package.json audit** — removed 4 unused `@fontsource*` deps.
- **Backup verify script** — gunzip + `pg_restore -l` parsing; optional `--restore-to=$URL` for full restore test.

### Bugs caught + fixed
- **`audit_log` table never existed** — every `recordAudit()` call had silently failed since launch. **Critical.**
- **Admin session token forgery** — base64-only with no HMAC. **Critical.**
- 7 thin programmatic-SEO stub pages converted to canonical 308 redirects (was indexable empty content).
- Stray `node_modules/` cache directory inside `src/pages/[locale]/second-opinion/` (800KB).
- 6 SEO audit critical bugs flagged in `SEO-AUDIT.md` were already fixed in working tree.
- `theme-color` meta tag accidentally received `var(--color-accent)` (browsers reject); reverted to literal hex.
- Workerd binary corruption after `npm i` stomped on it; reinstall pattern documented.
- `/from/[country]` routes 404 was design-intent (UK/US/CA/AU only); not a bug.

### Schema migrations applied
- `2026-05-05-audit-log.sql` — created `audit_log` to match Drizzle declaration.
- `2026-05-05-quote-drafts.sql` — `quote_drafts` table for abandoned-quote recovery.
- `2026-05-05-hospital-sameas.sql` — `hospitals.wikidata_id` + `wikipedia_url`.
- `2026-05-05-visa-last-verified.sql` — `visa_info.last_verified_at` + `verified_by`.

### Deferred (require deploy or larger scope)
- **CSP enforcement** — currently Report-Only. Flipping requires per-request nonces via Worker injector (140 inline scripts, 24 inline styles, 0 event handlers — clean baseline).
- **Astro `<Image>` migration** — Cloudflare adapter `imageService: "compile"` doesn't add AVIF/srcset at runtime; defer until a Cloudflare Images binding lands.
- **R2 self-hosted Unsplash fallbacks** — scaffold script ready; real run needs R2 binding + CDN domain.
- **Critical CSS extraction** — would require build-time tooling.
- **Hardcoded "9 min" → real median** — schema needs `responded_at` column + admin tooling + product decision on wording.
