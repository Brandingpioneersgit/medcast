/**
 * Backfill doctor_specialties for the 837 orphaned doctors.
 *
 * Strategy: match doctor.specialization or doctor.bio against specialty names / keywords.
 * Fall back to hospital's dominant specialty if doctor has no clear signal.
 */
import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  "cardiac-surgery": ["cardiac", "cardio", "heart", "cardiothor", "cardiovas", "CABG", "coronary"],
  "orthopedics": ["ortho", "joint", "spine", "knee", "hip", "bone", "fracture", "arthro"],
  "oncology": ["oncolog", "cancer", "tumor", "tumour", "hemato", "chemother", "radiation onc"],
  "organ-transplant": ["transplant", "liver surgeon", "kidney surgeon", "BMT", "bone marrow"],
  "neurology-neurosurgery": ["neuro", "brain", "spine surge", "nervous", "stroke", "epilep", "parkinson"],
  "gi-surgery": ["gastro", "GI surg", "liver specialist", "hepatob", "colorect", "bariatric"],
  "bariatric-surgery": ["bariatric", "obesity", "weight loss", "gastric sleeve", "gastric bypass"],
  "cosmetic-surgery": ["cosmetic", "plastic surge", "aesthet", "rhinoplast", "hair transplant"],
  "dental": ["dental", "dentist", "orthodon", "prosthodon", "periodontist"],
  "ophthalmology": ["ophthalm", "eye", "retina", "cataract", "LASIK", "cornea"],
  "ent-otolaryngology": ["ENT", "otolar", "ear nose throat", "rhinolog", "laryng", "audiolog"],
  "urology": ["urolog", "kidney", "prostate", "bladder", "andrology", "pediatric urol"],
  "gynecology": ["gynecolog", "obstetr", "OB-GYN", "reproduct", "infert", "menopause"],
  "pediatric-surgery": ["pediatric", "paediatric", "neonatal", "children"],
  "fertility-ivf": ["fertility", "IVF", "reproductive endocrin", "ICSI", "infert"],
};

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  const specialties: any[] = await sql`SELECT id, slug, name FROM specialties WHERE is_active = true`;
  const specBySlug = new Map<string, number>(specialties.map((s) => [s.slug, s.id]));
  const specByName = new Map<string, number>(specialties.map((s) => [s.name.toLowerCase(), s.id]));

  const doctors: any[] = await sql`
    SELECT d.id, d.name, d.title, d.qualifications, d.bio, d.hospital_id
    FROM doctors d
    WHERE d.is_active = true
      AND NOT EXISTS (SELECT 1 FROM doctor_specialties ds WHERE ds.doctor_id = d.id)
  `;
  console.log(`orphan doctors: ${doctors.length}`);

  // Fetch dominant specialty per hospital (used as fallback)
  const hospitalDomSpec: any[] = await sql`
    SELECT hs.hospital_id, hs.specialty_id
    FROM hospital_specialties hs
    JOIN specialties s ON s.id = hs.specialty_id
    WHERE s.is_active = true
    ORDER BY hs.hospital_id, hs.is_center_of_excellence DESC NULLS LAST, hs.patient_volume_yearly DESC NULLS LAST, hs.id
  `;
  const hospitalDomMap = new Map<number, number>();
  for (const r of hospitalDomSpec) {
    if (!hospitalDomMap.has(r.hospital_id)) hospitalDomMap.set(r.hospital_id, r.specialty_id);
  }

  const pairs: { doctor_id: number; specialty_id: number; is_primary: boolean }[] = [];
  let matched = 0;
  let fallback = 0;

  for (const d of doctors) {
    const haystack = `${d.qualifications ?? ""} ${d.title ?? ""} ${d.name ?? ""} ${d.bio ?? ""}`.toLowerCase();
    const matches = new Set<number>();

    for (const [slug, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
      for (const kw of keywords) {
        if (haystack.includes(kw.toLowerCase())) {
          const id = specBySlug.get(slug);
          if (id) matches.add(id);
          break;
        }
      }
    }

    // Also check against specialty names directly
    for (const [name, id] of specByName) {
      if (haystack.includes(name)) matches.add(id);
    }

    if (matches.size > 0) {
      matched++;
      const ids = Array.from(matches);
      pairs.push({ doctor_id: d.id, specialty_id: ids[0], is_primary: true });
      for (const id of ids.slice(1, 3)) pairs.push({ doctor_id: d.id, specialty_id: id, is_primary: false });
    } else if (d.hospital_id && hospitalDomMap.has(d.hospital_id)) {
      fallback++;
      pairs.push({ doctor_id: d.id, specialty_id: hospitalDomMap.get(d.hospital_id)!, is_primary: true });
    }
  }

  console.log(`keyword matches: ${matched} · hospital-fallback: ${fallback} · skipped: ${doctors.length - matched - fallback}`);
  console.log(`total pairs to insert: ${pairs.length}`);

  if (!DRY && pairs.length > 0) {
    for (let i = 0; i < pairs.length; i += 500) {
      const chunk = pairs.slice(i, i + 500);
      await sql`
        INSERT INTO doctor_specialties ${sql(chunk, "doctor_id", "specialty_id", "is_primary")}
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`inserted ${pairs.length} rows (ON CONFLICT DO NOTHING)`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
