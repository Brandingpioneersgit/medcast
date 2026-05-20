# Content Seeding Plan — MedCasts

## What's Missing

All Astro pages are structurally complete. Content comes from DB fields:
- `treatments.description` — multi-paragraph, reviewed, shown on treatment detail pages
- `conditions.description` — same, shown on condition detail pages
- `specialties.description` — shown on specialty hub pages
- `doctors.bio` — shown on doctor profiles
- `hospitals.description` — shown on hospital detail pages

Most records were seeded with placeholder or empty values. This plan seeds real editorial content.

## Content Strategy

### Treatments (88 records)
Each treatment gets 3-5 paragraphs:
1. **Lede** (~40 words) — what it is, when it's indicated
2. **Procedure** (~60 words) — what happens during the procedure
3. **Recovery** (~50 words) — hospital stay, downtime, follow-up
4. **Alternatives** (~40 words) — when another approach is better
5. **Why abroad** (~30 words) — cost/quality rationale for medical travel

### Conditions (79 records)
Each condition gets 2-4 paragraphs:
1. **Lede** (~40 words) — what the condition is, severity context
2. **Symptoms** (~40 words) — common presenting symptoms
3. **Treatment paths** (~50 words) — what treatments are typically considered
4. **Why abroad** (~30 words) — cost/quality rationale

### Specialties (~30 records)
Each specialty gets 2-3 paragraphs:
1. **Lede** (~40 words) — what the specialty covers
2. **Common procedures** (~60 words) — typical treatments within the specialty
3. **Accreditation** (~30 words) — what to look for in a center

### Structure
- First paragraph = hero lede (shown under H1)
- Subsequent paragraphs = "About" section below
- All content SEO-optimized: condition/treatment name appears in first 50 words
- Medical reviewer attribution set via `medical_reviewers` table
- FAQ rows seeded per entity (5-8 Q&A pairs per treatment/condition)

## Execution

File: `scripts/seed-content.ts`
- Uses Drizzle ORM with the existing `db` singleton
- Reads existing records, skips if `description` is already substantive (>200 chars)
- Uses structured content templates for consistency
- Sets `updatedAt` to now on modified rows
- Seed script is idempotent — safe to re-run
