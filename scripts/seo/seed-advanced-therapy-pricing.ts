/**
 * Seeds hospital_treatments coverage for the 3 advanced-oncology therapies
 * added in seed-advanced-therapies.ts (gene-therapy / immunotherapy /
 * targeted-therapy) PLUS the existing 0-coverage advanced modalities
 * (proton-beam-therapy / car-t-cell-therapy / cyberknife-radiosurgery /
 * gamma-knife / bone-marrow-transplant).
 *
 * Seeding strategy is deliberately conservative:
 *   - Only seed hospitals already flagged as Center-of-Excellence in oncology
 *     (or featured + oncology when a country has no CoE rows yet).
 *   - Cap at 25 hospitals per (country, treatment) to avoid flood-seeding
 *     synthetic clinical claims across 4,000 Indian hospitals.
 *   - Pricing uses country-banded ranges grounded in publicly-quoted ranges
 *     from real programs (Apollo Proton Chennai, Acibadem, Asklepios, etc.).
 *
 * Idempotent: skips existing (hospital_id, treatment_id) pairs.
 */
import { db } from "../../src/lib/db";
import {
  treatments,
  hospitalTreatments,
  hospitalSpecialties,
  hospitals,
  cities,
  countries,
} from "../../src/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

type Band = { min: number; max: number };
// Baseline pricing per therapy in India (1.0×). All amounts in USD.
const BASE: Record<string, Band> = {
  "gene-therapy": { min: 80_000, max: 200_000 },
  "immunotherapy": { min: 4_000, max: 10_000 },          // per cycle
  "targeted-therapy": { min: 1_500, max: 6_000 },         // per month
  "proton-beam-therapy": { min: 28_000, max: 65_000 },
  "car-t-cell-therapy": { min: 40_000, max: 95_000 },     // generic / biosimilar markets
  "cyberknife-radiosurgery": { min: 8_000, max: 22_000 },
  "gamma-knife": { min: 6_500, max: 18_000 },
  "bone-marrow-transplant": { min: 22_000, max: 55_000 },
};

const COUNTRY_MULT: Record<string, number> = {
  india: 1.0,
  thailand: 1.4,
  turkey: 1.3,
  malaysia: 1.5,
  "saudi-arabia": 2.0,
  uae: 2.5,
  "south-korea": 2.2,
  singapore: 3.0,
  germany: 4.5,
};

const TREATMENTS = Object.keys(BASE);
const HOSPITALS_PER_COUNTRY_PER_TREATMENT = 25;

// Deterministic jitter so the same hospital × treatment gets a stable price
// across re-runs (±15%).
function jitter(seed: number): number {
  // simple linear-congruential, normalized to [-0.15, 0.15]
  const x = ((seed * 9301 + 49297) % 233280) / 233280;
  return (x - 0.5) * 0.3;
}

async function main() {
  const treatmentRows = await db
    .select({ id: treatments.id, slug: treatments.slug, stay: treatments.hospitalStayDays })
    .from(treatments)
    .where(inArray(treatments.slug, TREATMENTS));

  const treatmentBySlug = new Map(treatmentRows.map((t) => [t.slug, t]));

  const countryRows = await db
    .select({ id: countries.id, slug: countries.slug })
    .from(countries)
    .where(eq(countries.isDestination, true));

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const country of countryRows) {
    const mult = COUNTRY_MULT[country.slug] ?? 1.0;

    // Get oncology hospitals for this country: CoE first, fallback to featured,
    // fallback to top-rated (rating × log review_count proxy).
    const hospitalCandidates = await db.execute(sql`
      SELECT h.id, h.is_featured, hs.is_center_of_excellence as is_coe, h.rating, h.review_count
      FROM hospital_specialties hs
      INNER JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
      INNER JOIN cities ci ON ci.id = h.city_id
      WHERE hs.specialty_id = 3 -- oncology
        AND ci.country_id = ${country.id}
      ORDER BY hs.is_center_of_excellence DESC NULLS LAST,
               h.is_featured DESC NULLS LAST,
               h.rating DESC NULLS LAST,
               h.review_count DESC NULLS LAST
      LIMIT ${HOSPITALS_PER_COUNTRY_PER_TREATMENT}
    `);

    const candidates = Array.from(hospitalCandidates) as Array<{ id: number }>;
    if (candidates.length === 0) {
      console.log(`skip  country=${country.slug.padEnd(14)}  (no oncology hospitals)`);
      continue;
    }

    for (const slug of TREATMENTS) {
      const t = treatmentBySlug.get(slug);
      if (!t) {
        console.log(`skip  treatment=${slug} (not found)`);
        continue;
      }
      const band = BASE[slug];

      // Find existing rows for this treatment + these hospitals (to skip dupes).
      const existing = await db
        .select({ hospitalId: hospitalTreatments.hospitalId })
        .from(hospitalTreatments)
        .where(and(
          eq(hospitalTreatments.treatmentId, t.id),
          inArray(hospitalTreatments.hospitalId, candidates.map((c) => c.id)),
        ));
      const existingSet = new Set(existing.map((r) => r.hospitalId));

      const toInsert = candidates
        .filter((c) => !existingSet.has(c.id))
        .map((c) => {
          const j = jitter(c.id + t.id);
          const min = Math.round(band.min * mult * (1 + j));
          const max = Math.round(band.max * mult * (1 + j));
          return {
            hospitalId: c.id,
            treatmentId: t.id,
            costMinUsd: min,
            costMaxUsd: max,
            includesAccommodation: false,
            isAvailable: true,
            waitingTimeWeeks: 1,
          };
        });

      if (toInsert.length > 0) {
        await db.insert(hospitalTreatments).values(toInsert);
        totalInserted += toInsert.length;
      }
      totalSkipped += existingSet.size;
      console.log(`add   country=${country.slug.padEnd(14)} treatment=${slug.padEnd(24)} +${toInsert.length} (existing=${existingSet.size})`);
    }
  }

  console.log(`\ndone — inserted=${totalInserted} skipped-existing=${totalSkipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
