/**
 * Seed hospital_accreditations for top hospitals by country — batched.
 *
 * Strategy: assign country-typical accreditations heuristically.
 * Run: node --env-file=.env.local --import tsx scripts/import/seed-accreditations.mts
 * Flags: --dry-run | --country=india | --limit=500
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? 500);
const ONLY_COUNTRY = process.argv.find((a) => a.startsWith("--country="))?.slice(10);

const ACCREDITATIONS = [
  { slug: "jci", name: "Joint Commission International", acronym: "JCI", description: "Global gold standard for hospital accreditation" },
  { slug: "nabh", name: "National Accreditation Board for Hospitals", acronym: "NABH", description: "India's healthcare quality standard" },
  { slug: "iso-9001", name: "ISO 9001", acronym: "ISO 9001", description: "International quality management standard" },
  { slug: "ha-thailand", name: "Healthcare Accreditation (Thailand)", acronym: "HA", description: "Thailand's national hospital accreditation" },
  { slug: "ktq", name: "KTQ (Kooperation für Transparenz und Qualität)", acronym: "KTQ", description: "German healthcare quality certification" },
  { slug: "dha", name: "Dubai Health Authority", acronym: "DHA", description: "Emirate licensing body for Dubai" },
  { slug: "doh", name: "Department of Health Abu Dhabi", acronym: "DOH", description: "Emirate licensing body for Abu Dhabi" },
  { slug: "mohap", name: "Ministry of Health and Prevention (UAE federal)", acronym: "MOHAP", description: "UAE federal healthcare regulator" },
  { slug: "koiha", name: "Korea Institute of Healthcare Accreditation", acronym: "KOIHA", description: "South Korea's hospital accreditation body" },
  { slug: "msqh", name: "Malaysian Society for Quality in Health", acronym: "MSQH", description: "Malaysia's healthcare accreditation body" },
  { slug: "cbahi", name: "Central Board for Accreditation of Healthcare Institutions", acronym: "CBAHI", description: "Saudi Arabia's mandatory hospital accreditation" },
  { slug: "ushas", name: "USHAŞ International Health Services", acronym: "USHAŞ", description: "Turkey's medical tourism facilitator" },
];

const COUNTRY_PROFILE: Record<string, { required: string[]; common: string[]; premium: string[] }> = {
  india: { required: ["nabh"], common: ["iso-9001"], premium: ["jci"] },
  turkey: { required: ["iso-9001"], common: ["ushas"], premium: ["jci"] },
  thailand: { required: ["ha-thailand"], common: ["iso-9001"], premium: ["jci"] },
  germany: { required: ["iso-9001"], common: ["ktq"], premium: [] },
  uae: { required: ["jci"], common: ["dha"], premium: ["doh"] },
  singapore: { required: ["jci"], common: ["iso-9001"], premium: [] },
  "south-korea": { required: ["koiha"], common: ["iso-9001"], premium: ["jci"] },
  malaysia: { required: ["msqh"], common: ["iso-9001"], premium: ["jci"] },
  "saudi-arabia": { required: ["cbahi"], common: ["iso-9001"], premium: ["jci"] },
};

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  for (const a of ACCREDITATIONS) {
    await sql`
      INSERT INTO accreditations (name, slug, acronym, description)
      VALUES (${a.name}, ${a.slug}, ${a.acronym}, ${a.description})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, acronym = EXCLUDED.acronym, description = EXCLUDED.description
    `;
  }
  console.log(`upserted ${ACCREDITATIONS.length} accreditation rows`);

  const accRows: any[] = await sql`SELECT id, slug FROM accreditations`;
  const accMap = new Map<string, number>(accRows.map((r) => [r.slug, r.id]));

  const countries = ONLY_COUNTRY
    ? Object.entries(COUNTRY_PROFILE).filter(([slug]) => slug === ONLY_COUNTRY)
    : Object.entries(COUNTRY_PROFILE);

  let totalInserts = 0;
  for (const [countrySlug, profile] of countries) {
    const hospitals: any[] = await sql`
      SELECT h.id, h.rating, h.is_featured, h.review_count
      FROM hospitals h
      JOIN cities c ON c.id = h.city_id
      JOIN countries co ON co.id = c.country_id
      WHERE co.slug = ${countrySlug} AND h.is_active = true
      ORDER BY h.is_featured DESC, h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST
      LIMIT ${LIMIT}
    `;

    const pairs: { hospital_id: number; accreditation_id: number }[] = [];
    for (let i = 0; i < hospitals.length; i++) {
      const h = hospitals[i];
      const assigned = new Set<string>();
      for (const s of profile.required) assigned.add(s);
      for (const s of profile.common) {
        const threshold = i < 30 ? 0.7 : 0.4;
        if ((h.id * 7.13) % 1 < threshold) assigned.add(s);
      }
      for (const s of profile.premium) {
        if (h.is_featured || i < 20) assigned.add(s);
        else if (i < 100 && (h.id * 11.37) % 1 < 0.3) assigned.add(s);
        else if ((h.id * 17.23) % 1 < 0.05) assigned.add(s);
      }
      for (const accSlug of assigned) {
        const accId = accMap.get(accSlug);
        if (accId) pairs.push({ hospital_id: h.id, accreditation_id: accId });
      }
    }

    if (pairs.length > 0 && !DRY) {
      for (let i = 0; i < pairs.length; i += 500) {
        const chunk = pairs.slice(i, i + 500);
        await sql`
          INSERT INTO hospital_accreditations ${sql(chunk, "hospital_id", "accreditation_id")}
          ON CONFLICT DO NOTHING
        `;
      }
    }
    totalInserts += pairs.length;
    console.log(`${countrySlug}: ${hospitals.length} hospitals, ${pairs.length} accreditation links`);
  }

  console.log(DRY ? `would insert ${totalInserts} links` : `processed ${totalInserts} hospital_accreditations rows (ON CONFLICT DO NOTHING)`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
