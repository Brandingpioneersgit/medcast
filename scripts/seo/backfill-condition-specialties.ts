/**
 * Backfills condition_specialties for the 5 conditions that had NO specialty
 * path at all (neither a direct condition_specialties row nor a
 * condition_treatments -> treatment.specialty link).
 *
 * Without a specialty path, /condition/[slug]/doctors and the country-scoped
 * /condition/[slug]/doctors/[country] pages render zero doctors and 301 away.
 * These mappings light those pages up.
 *
 * Mappings are hand-curated (only 5 conditions) for clinical correctness.
 * Idempotent: skips rows that already exist.
 */
import { db } from "../../src/lib/db";
import { conditions, specialties, conditionSpecialties } from "../../src/lib/db/schema";
import { and, eq } from "drizzle-orm";

const MAP: Record<string, string[]> = {
  "heart-blockage": ["cardiac-surgery"],
  "kidney-failure": ["organ-transplant", "urology"],
  "knee-pain": ["orthopedics"],
  "liver-failure": ["organ-transplant", "gi-surgery"],
  "spinal-disc-herniation": ["neurology-neurosurgery", "orthopedics"],
};

async function main() {
  const condRows = await db.select({ id: conditions.id, slug: conditions.slug }).from(conditions);
  const condBySlug = new Map(condRows.map((c) => [c.slug, c.id]));
  const specRows = await db.select({ id: specialties.id, slug: specialties.slug }).from(specialties);
  const specBySlug = new Map(specRows.map((s) => [s.slug, s.id]));

  let inserted = 0;
  let skipped = 0;
  for (const [condSlug, specSlugs] of Object.entries(MAP)) {
    const conditionId = condBySlug.get(condSlug);
    if (!conditionId) {
      console.log(`skip  ${condSlug.padEnd(24)} (condition not found)`);
      continue;
    }
    for (const specSlug of specSlugs) {
      const specialtyId = specBySlug.get(specSlug);
      if (!specialtyId) {
        console.log(`skip  ${condSlug} -> ${specSlug} (specialty not found)`);
        continue;
      }
      const existing = await db
        .select({ condition_id: conditionSpecialties.conditionId })
        .from(conditionSpecialties)
        .where(and(
          eq(conditionSpecialties.conditionId, conditionId),
          eq(conditionSpecialties.specialtyId, specialtyId),
        ));
      if (existing.length > 0) {
        console.log(`skip  ${condSlug} -> ${specSlug} (already mapped)`);
        skipped++;
        continue;
      }
      await db.insert(conditionSpecialties).values({ conditionId, specialtyId });
      console.log(`add   ${condSlug} -> ${specSlug}`);
      inserted++;
    }
  }
  console.log(`\ndone — inserted=${inserted} skipped=${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
