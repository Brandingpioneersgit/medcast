/**
 * Batch 1 — Hospital × Specialty heuristic assignment.
 *
 * Strategy:
 *   1. Keyword scan of hospital.name + description → direct specialty matches
 *      (sets `isCenterOfExcellence = true` for name-level matches).
 *   2. Dental/eye/fertility clinics keep a narrow profile (keyword-only).
 *   3. Every generic "Hospital" / "Medical Center" / "Clinic" gets a country-tuned
 *      core specialty bundle (cardiac, ortho, onco, neuro, gi, ophthalmology)
 *      with country-specific additions (cosmetic+bariatric for Turkey/Thailand, etc.).
 *   4. Quality tier: rating >= 4 OR reviewCount >= 10 → add "premium" services
 *      (organ-transplant, fertility-ivf).
 *
 * Idempotent: uses ON CONFLICT DO NOTHING on the hospital_specialties unique index.
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/assign-hospital-specialties.ts
 * Flags:
 *   --dry-run                   count only, no writes
 *   --country=india             only one country
 *   --limit=500                 cap hospitals processed
 */

import postgres from "postgres";

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_COUNTRY = arg("--country=");
const LIMIT = Number(arg("--limit=") ?? 0);

function arg(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a?.slice(prefix.length);
}

const KEYWORDS: Record<string, string[]> = {
  "cardiac-surgery": ["cardiac", "cardiology", "cardio", "heart", "cardiovascular"],
  "orthopedics": ["ortho", "orthopaedic", "orthopedic", "joint", "spine", "knee", "sports medicine"],
  "oncology": ["oncology", "cancer", "tumor", "tumour", "hemat"],
  "neurology-neurosurgery": ["neuro", "brain", "spine ", "stroke"],
  "organ-transplant": ["transplant"],
  "gi-surgery": ["gastro", "gastroenterology", "digestive", "liver ", "hepato"],
  "cosmetic-surgery": ["cosmetic", "plastic surg", "aesthetic"],
  "fertility-ivf": ["fertility", "ivf", "reproductive", "infertility"],
  "ophthalmology": ["eye ", "ophthalm", "vision", "retina"],
  "dental": ["dental", "dentistry", "dentis"],
  "bariatric-surgery": ["bariatric", "obesity", "weight loss"],
  "urology": ["urology", "urolog", "nephrolog", "kidney"],
  "gynecology": ["gynec", "obstet", "women's", "womens ", "maternity"],
  "ent-otolaryngology": ["ent ", "otolaryng", "otorhin", "ear nose"],
  "pediatric-surgery": ["pediatric", "paediatric", "children", "childrens", "kid"],
};

// Narrow-profile markers: if a hospital name matches one of these,
// assume it's a single-focus clinic and ONLY assign the matched specialty.
const NARROW_MARKERS: Record<string, string> = {
  "dental": "dental",
  "eye hospital": "ophthalmology",
  "eye clinic": "ophthalmology",
  "eye centre": "ophthalmology",
  "eye center": "ophthalmology",
  "ophthalm": "ophthalmology",
  "fertility": "fertility-ivf",
  "ivf center": "fertility-ivf",
  "maternity": "gynecology",
  "children's": "pediatric-surgery",
  "childrens hospital": "pediatric-surgery",
};

// Generic hospital (no narrow marker) gets this base bundle.
const CORE_BUNDLE = [
  "cardiac-surgery",
  "orthopedics",
  "oncology",
  "neurology-neurosurgery",
  "gi-surgery",
  "ophthalmology",
];

// Country-tuned add-ons (medical-tourism strengths).
const COUNTRY_ADDONS: Record<string, string[]> = {
  india: ["organ-transplant", "fertility-ivf", "urology", "pediatric-surgery"],
  thailand: ["cosmetic-surgery", "bariatric-surgery", "dental", "fertility-ivf"],
  turkey: ["cosmetic-surgery", "bariatric-surgery", "dental", "fertility-ivf"],
  germany: ["organ-transplant", "urology", "ent-otolaryngology"],
  "south-korea": ["cosmetic-surgery", "dental", "ent-otolaryngology"],
  malaysia: ["fertility-ivf", "cosmetic-surgery", "dental"],
  singapore: ["organ-transplant", "fertility-ivf", "urology"],
  "united-arab-emirates": ["cosmetic-surgery", "fertility-ivf", "dental"],
  "saudi-arabia": ["organ-transplant", "urology", "gynecology"],
};

type Hospital = {
  id: number;
  name: string;
  description: string | null;
  rating: string | null;
  reviewCount: number | null;
  countrySlug: string;
};

function pickSpecialties(h: Hospital): Array<{ slug: string; coe: boolean }> {
  const hay = `${h.name} ${h.description ?? ""}`.toLowerCase();
  const nameLc = h.name.toLowerCase();

  // Check narrow-focus clinics first.
  for (const [marker, slug] of Object.entries(NARROW_MARKERS)) {
    if (nameLc.includes(marker)) {
      return [{ slug, coe: true }];
    }
  }

  const picked = new Map<string, boolean>(); // slug → coeFlag

  // Keyword matches.
  for (const [slug, keys] of Object.entries(KEYWORDS)) {
    const inName = keys.some((k) => nameLc.includes(k));
    const inDesc = keys.some((k) => hay.includes(k));
    if (inName) picked.set(slug, true);
    else if (inDesc && !picked.has(slug)) picked.set(slug, false);
  }

  // Every hospital (it's in the hospitals table by definition) gets the
  // core bundle + country addons. Narrow markers already returned early.
  for (const slug of CORE_BUNDLE) if (!picked.has(slug)) picked.set(slug, false);
  const addons = COUNTRY_ADDONS[h.countrySlug] ?? [];
  for (const slug of addons) if (!picked.has(slug)) picked.set(slug, false);

  // Quality tier adds premium services.
  const rating = Number(h.rating ?? 0);
  const reviews = h.reviewCount ?? 0;
  if (rating >= 4 || reviews >= 10) {
    for (const slug of ["organ-transplant", "fertility-ivf"]) {
      if (!picked.has(slug)) picked.set(slug, false);
    }
  }

  return Array.from(picked.entries()).map(([slug, coe]) => ({ slug, coe }));
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 4, prepare: false });

  // Map specialty slug → id.
  const specialtyRows = await sql<{ id: number; slug: string }[]>`
    SELECT id, slug FROM specialties
  `;
  const specialtyId = new Map(specialtyRows.map((r) => [r.slug, r.id]));

  // Load hospitals (+ country slug).
  const whereCountry = ONLY_COUNTRY ? sql`AND co.slug = ${ONLY_COUNTRY}` : sql``;
  const limitClause = LIMIT ? sql`LIMIT ${LIMIT}` : sql``;
  const hospitals = await sql<Hospital[]>`
    SELECT h.id, h.name, h.description, h.rating::text, h.review_count AS "reviewCount",
           co.slug AS "countrySlug"
    FROM hospitals h
    JOIN cities ci ON ci.id = h.city_id
    JOIN countries co ON co.id = ci.country_id
    WHERE h.is_active = true
    ${whereCountry}
    ORDER BY h.id
    ${limitClause}
  `;

  console.log(`Scoped ${hospitals.length} hospitals.`);

  let planned = 0;
  let written = 0;
  let skipped = 0;
  const distribution: Record<string, number> = {};

  const BATCH = 500;
  for (let i = 0; i < hospitals.length; i += BATCH) {
    const slice = hospitals.slice(i, i + BATCH);
    const rows: { hid: number; sid: number; coe: boolean }[] = [];
    for (const h of slice) {
      const picks = pickSpecialties(h);
      if (picks.length === 0) {
        skipped++;
        continue;
      }
      for (const p of picks) {
        const sid = specialtyId.get(p.slug);
        if (!sid) continue;
        rows.push({ hid: h.id, sid, coe: p.coe });
        distribution[p.slug] = (distribution[p.slug] ?? 0) + 1;
        planned++;
      }
    }
    if (!DRY_RUN && rows.length > 0) {
      const values = rows
        .map((r) => `(${r.hid}, ${r.sid}, ${r.coe ? "true" : "false"})`)
        .join(",");
      const res = await sql.unsafe(`
        INSERT INTO hospital_specialties (hospital_id, specialty_id, is_center_of_excellence)
        VALUES ${values}
        ON CONFLICT (hospital_id, specialty_id) DO NOTHING
      `);
      written += (res as any).count ?? 0;
    }
    process.stdout.write(`\r  processed ${Math.min(i + BATCH, hospitals.length)}/${hospitals.length} · planned ${planned}`);
  }
  console.log();

  console.log("\nDistribution (assignments per specialty):");
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  for (const [slug, n] of sorted) console.log(`  ${slug.padEnd(26)} ${n}`);

  console.log(`\nHospitals with zero matches: ${skipped}`);
  console.log(`Rows planned: ${planned}`);
  if (!DRY_RUN) console.log(`Rows inserted (excluding pre-existing): ${written}`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
