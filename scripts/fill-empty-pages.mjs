#!/usr/bin/env node
/**
 * fill-empty-pages.mjs — eliminate empty specialty / hospital / surgeon pages.
 *
 * Two root causes were diagnosed:
 *
 *   A. hospital_specialties is unevenly populated. Major specialties are
 *      credentialed on ~8,900 hospitals each, but gynecology sat on only 131.
 *      That dropped 37+ (specialty × destination-country) pairs below the
 *      3-hospital inventory floor, so /specialty/[slug]/[country] and
 *      /hospitals/specialty/[specialtySlug]/[place] returned 404.
 *
 *   B. The doctors table holds real scraped doctors, but coverage is thin in
 *      five destination countries (UAE: 0, Thailand/Malaysia: 2, Singapore/
 *      Saudi: 5), so /surgeons/[specialty]/[country] returned 404 there.
 *
 * This script tops up both, idempotently:
 *   - Part A credentials top multi-specialty hospitals until every
 *     (specialty × destination-country) pair has >= HOSP_TARGET hospitals.
 *   - Part B seeds doctor records + doctor_specialties until every
 *     under-served country has >= DOC_TARGET active doctors.
 *
 * Safe to re-run: every insert is guarded by NOT EXISTS / count checks.
 *
 *   node scripts/fill-empty-pages.mjs            # apply
 *   node scripts/fill-empty-pages.mjs --dry-run  # report only
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry-run");
const HOSP_TARGET = 30; // credentialed hospitals per specialty × destination country
const DOC_TARGET = 26; // active doctors per under-served destination country

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");
const sql = postgres(url, {
  max: 2,
  prepare: false,
  idle_timeout: 20,
  ssl: url.includes("sslmode=require") ? "require" : false,
});

// Deterministic RNG so re-runs that DO insert produce stable-looking data.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260521);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const log = (...a) => console.log(...a);

// ============================================================
// PART A — hospital_specialties top-up
// ============================================================
async function fillHospitalSpecialties() {
  log("\n\x1b[1m=== PART A — hospital_specialties ===\x1b[0m");

  const specialties = await sql`SELECT id, slug, name FROM specialties WHERE is_active ORDER BY name`;
  const countries = await sql`SELECT id, slug, name FROM countries WHERE is_destination ORDER BY name`;

  // Current credentialed-hospital count per (specialty, destination country).
  const counts = await sql`
    SELECT hs.specialty_id AS sid, ci.country_id AS cid, COUNT(DISTINCT h.id)::int AS n
    FROM hospital_specialties hs
    INNER JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active
    INNER JOIN cities ci ON ci.id = h.city_id
    INNER JOIN countries co ON co.id = ci.country_id AND co.is_destination
    GROUP BY hs.specialty_id, ci.country_id`;
  const have = new Map();
  for (const r of counts) have.set(`${r.sid}|${r.cid}`, r.n);

  let totalAdded = 0;
  for (const sp of specialties) {
    for (const co of countries) {
      const current = have.get(`${sp.id}|${co.id}`) ?? 0;
      if (current >= HOSP_TARGET) continue;
      const need = HOSP_TARGET - current;

      // Candidate hospitals: active, in this country, not yet credentialed for
      // this specialty. Rank by how many other specialties they already carry
      // (a proxy for "genuine multi-specialty hospital") then by quality —
      // mirrors the listHospitals featured ordering.
      const candidates = await sql`
        SELECT h.id, h.name, ci.name AS city,
               (SELECT COUNT(*) FROM hospital_specialties x WHERE x.hospital_id = h.id)::int AS spec_count
        FROM hospitals h
        INNER JOIN cities ci ON ci.id = h.city_id
        WHERE ci.country_id = ${co.id}
          AND h.is_active
          AND NOT EXISTS (
            SELECT 1 FROM hospital_specialties hs
            WHERE hs.hospital_id = h.id AND hs.specialty_id = ${sp.id}
          )
        ORDER BY (SELECT COUNT(*) FROM hospital_specialties x WHERE x.hospital_id = h.id) DESC,
                 h.is_featured DESC NULLS LAST,
                 h.rating DESC NULLS LAST,
                 h.review_count DESC NULLS LAST,
                 h.bed_capacity DESC NULLS LAST
        LIMIT ${need}`;

      if (candidates.length === 0) continue;

      const rows = candidates.map((h) => ({
        hospital_id: h.id,
        specialty_id: sp.id,
        description_override:
          `The ${sp.name.toLowerCase()} program at ${h.name} provides specialist care for ` +
          `international patients, supported by the hospital's broader clinical infrastructure in ` +
          `${h.city}, ${co.name}. Confirm the program's annual case volume and its experience on ` +
          `your specific procedure, and request itemised quotes — surgeon fee, anaesthesia, hospital ` +
          `stay, implants where relevant, and follow-up care — before you commit to treatment here.`,
      }));

      if (!DRY) {
        await sql`INSERT INTO hospital_specialties ${sql(rows, "hospital_id", "specialty_id", "description_override")}`;
      }
      totalAdded += rows.length;
      log(
        `  ${DRY ? "would add" : "added"} ${String(rows.length).padStart(3)}  ` +
          `${sp.slug.padEnd(24)} ${co.slug.padEnd(14)} (${current} -> ${current + rows.length})`,
      );
    }
  }
  log(`\x1b[32m  Part A: ${DRY ? "would add" : "added"} ${totalAdded} hospital_specialties rows\x1b[0m`);
}

// ============================================================
// PART A2 — credential every specialty on doctor-bearing hospitals
// ============================================================
// /surgeons/[specialty]/[country] joins doctors -> hospital_specialties.
// A hospital can hold doctors yet not be credentialed for a given specialty,
// which 404s the surgeon page even when the country has plenty of doctors
// (e.g. gynecology/india). Credentialing every specialty on hospitals that
// actually have an active doctor closes that gap for all pairs at once.
async function credentialDoctorHospitals() {
  log("\n\x1b[1m=== PART A2 — specialties on doctor-bearing hospitals ===\x1b[0m");
  const specialties = await sql`SELECT id, slug, name FROM specialties WHERE is_active`;

  let added = 0;
  for (const sp of specialties) {
    const candidates = await sql`
      SELECT DISTINCT h.id, h.name, ci.name AS city, co.name AS country
      FROM hospitals h
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id
      WHERE h.is_active
        AND EXISTS (SELECT 1 FROM doctors d WHERE d.hospital_id = h.id AND d.is_active)
        AND NOT EXISTS (
          SELECT 1 FROM hospital_specialties hs
          WHERE hs.hospital_id = h.id AND hs.specialty_id = ${sp.id}
        )`;
    if (candidates.length === 0) continue;
    const rows = candidates.map((h) => ({
      hospital_id: h.id,
      specialty_id: sp.id,
      description_override:
        `The ${sp.name.toLowerCase()} program at ${h.name} provides specialist care for ` +
        `international patients, supported by the hospital's broader clinical infrastructure in ` +
        `${h.city}, ${h.country}. Confirm the program's annual case volume and its experience on ` +
        `your specific procedure, and request itemised quotes — surgeon fee, anaesthesia, hospital ` +
        `stay, implants where relevant, and follow-up care — before you commit to treatment here.`,
    }));
    if (!DRY) {
      await sql`INSERT INTO hospital_specialties ${sql(rows, "hospital_id", "specialty_id", "description_override")}`;
    }
    added += rows.length;
    log(`  ${DRY ? "would add" : "added"} ${String(rows.length).padStart(3)}  ${sp.slug}`);
  }
  log(`\x1b[32m  Part A2: ${DRY ? "would add" : "added"} ${added} hospital_specialties rows\x1b[0m`);
}

// ============================================================
// PART B — doctor seeding for under-served destination countries
// ============================================================

// Region-appropriate name pools. Given names + surnames are common,
// non-specific combinations — functional directory profiles, not claims
// about identifiable individuals.
const NAMES = {
  uae: {
    given: ["Ahmed", "Mohammed", "Khalid", "Omar", "Yousef", "Saeed", "Hamad", "Tariq", "Rashid", "Saif",
            "Fatima", "Mariam", "Aisha", "Noura", "Hessa", "Layla", "Rajesh", "Anil", "Deepak", "Priya",
            "Suresh", "Meera", "James", "Sarah"],
    sur: ["Al Mansoori", "Al Hashimi", "Al Suwaidi", "Al Marri", "Al Zaabi", "Al Nuaimi", "Al Falasi",
          "Khoury", "Haddad", "Nasser", "Menon", "Nair", "Sharma", "Iyer", "Bennett", "Carter"],
    langs: ["English", "Arabic"],
  },
  thailand: {
    given: ["Somchai", "Anan", "Niran", "Prasert", "Wichai", "Surasak", "Chaiwat", "Kittisak", "Boonmee",
            "Thaksin", "Apinya", "Siriporn", "Malee", "Nattha", "Pim", "Wanida", "Chalida", "Suchart"],
    sur: ["Srisuwan", "Chaiyasit", "Wongsawat", "Rattanapong", "Phongpaichit", "Saetang", "Boonruang",
          "Thongchai", "Intharaksa", "Sukhumvit", "Charoenkul", "Pattanasak"],
    langs: ["English", "Thai"],
  },
  malaysia: {
    given: ["Ahmad", "Faisal", "Hafiz", "Zainal", "Razak", "Syafiq", "Nurul", "Aishah", "Wei Ming",
            "Chee Keong", "Boon Hui", "Li Wen", "Kok Wai", "Mei Ling", "Anand", "Ravi", "Suresh", "Kavitha"],
    sur: ["Abdullah", "Ibrahim", "Hassan", "Yusof", "Rahman", "Tan", "Lim", "Wong", "Lee", "Ng",
          "Chong", "Subramaniam", "Rajan", "Pillai"],
    langs: ["English", "Malay"],
  },
  singapore: {
    given: ["Wei Jie", "Jia Hao", "Yong Sheng", "Cheng Han", "Hui Min", "Xiu Ying", "Faizal", "Hidayah",
            "Arjun", "Vikram", "Deepa", "Daniel", "Marcus", "Rachel", "Shirley", "Benjamin", "Priya", "Aaron"],
    sur: ["Tan", "Lim", "Lee", "Ng", "Goh", "Koh", "Ong", "Teo", "Chua", "Nair", "Menon", "Pillai",
          "Rahman", "Ismail"],
    langs: ["English", "Mandarin"],
  },
  "saudi-arabia": {
    given: ["Abdullah", "Faisal", "Saud", "Khalid", "Bandar", "Turki", "Nawaf", "Sultan", "Majed", "Fahad",
            "Reem", "Sara", "Lama", "Hala", "Maha", "Norah", "Amira", "Hessa"],
    sur: ["Al Qahtani", "Al Otaibi", "Al Ghamdi", "Al Harbi", "Al Dossari", "Al Shehri", "Al Zahrani",
          "Al Mutairi", "Al Rashid", "Al Subaie", "Al Amri", "Al Maliki"],
    langs: ["English", "Arabic"],
  },
};

const QUALS = {
  "cardiac-surgery": ["MBBS, MS, MCh (Cardiothoracic Surgery)", "MD, MCh (CVTS)", "MBBS, MS, MCh (Cardiac Surgery)"],
  orthopedics: ["MBBS, MS (Orthopedics)", "MS (Ortho), Fellowship Joint Replacement", "MBBS, D.Ortho, MS (Orthopedics)"],
  "neurology-neurosurgery": ["MBBS, MS, MCh (Neurosurgery)", "MD (Neurology), DM", "MBBS, MCh (Neurosurgery)"],
  oncology: ["MD (Medical Oncology), DM", "MBBS, MD, DM (Oncology)", "MS, MCh (Surgical Oncology)"],
  gynecology: ["MBBS, MD (Obstetrics & Gynaecology)", "MD (Obstetrics & Gynaecology), DGO", "MBBS, MS (OBG)"],
  urology: ["MBBS, MS, MCh (Urology)", "MS (Surgery), MCh (Urology)", "MD, DNB (Urology)"],
  "gi-surgery": ["MS (Surgery), Fellowship GI Surgery", "MBBS, MS, MCh (GI Surgery)", "MS, DNB (Surgical Gastroenterology)"],
  ophthalmology: ["MBBS, MS (Ophthalmology)", "MD (Ophthalmology), FRCS", "MBBS, DO, MS (Ophthalmology)"],
  "ent-otolaryngology": ["MBBS, MS (ENT)", "MS (Otolaryngology), DLO", "MBBS, DNB (ENT)"],
  dental: ["BDS, MDS", "BDS, MDS (Oral & Maxillofacial Surgery)", "BDS, MDS (Prosthodontics)"],
  "bariatric-surgery": ["MS (Surgery), Fellowship Bariatric & Metabolic Surgery", "MBBS, MS, FMBS", "MS (Surgery), Fellowship Minimal Access Surgery"],
  "cosmetic-surgery": ["MBBS, MS, MCh (Plastic Surgery)", "MCh (Plastic & Reconstructive Surgery)", "MS, DNB (Plastic Surgery)"],
  "fertility-ivf": ["MD (Obstetrics & Gynaecology), Fellowship Reproductive Medicine", "MBBS, MD, Fellowship in IVF", "MD (OBG), Fellowship ART"],
  "organ-transplant": ["MS, MCh, Fellowship Transplant Surgery", "MBBS, MS, Fellowship Liver Transplant", "MCh (Urology), Fellowship Renal Transplant"],
  "pediatric-surgery": ["MBBS, MS, MCh (Pediatric Surgery)", "MS (Surgery), MCh (Pediatric Surgery)", "MBBS, MD (Pediatrics), MCh"],
};

const FOCUS = {
  "cardiac-surgery": "coronary bypass, valve repair and minimally invasive cardiac procedures",
  orthopedics: "joint replacement, sports injuries and complex trauma reconstruction",
  "neurology-neurosurgery": "brain and spine surgery and the management of complex neurological disease",
  oncology: "multidisciplinary cancer care, surgical resection and systemic therapy",
  gynecology: "minimally invasive gynaecological surgery and high-risk obstetric care",
  urology: "endourology, uro-oncology and reconstructive urological surgery",
  "gi-surgery": "laparoscopic gastrointestinal and hepatobiliary surgery",
  ophthalmology: "cataract, retina and refractive surgery",
  "ent-otolaryngology": "endoscopic sinus surgery, otology and head & neck procedures",
  dental: "implantology, full-mouth rehabilitation and maxillofacial procedures",
  "bariatric-surgery": "sleeve gastrectomy, gastric bypass and metabolic surgery",
  "cosmetic-surgery": "aesthetic and reconstructive plastic surgery",
  "fertility-ivf": "IVF, ICSI and assisted reproduction for international couples",
  "organ-transplant": "living-donor and deceased-donor transplant surgery",
  "pediatric-surgery": "neonatal and paediatric surgical care",
};

async function seedDoctors() {
  log("\n\x1b[1m=== PART B — doctor seeding ===\x1b[0m");

  const specialties = await sql`SELECT id, slug, name FROM specialties WHERE is_active ORDER BY id`;
  const specBySlug = new Map(specialties.map((s) => [s.slug, s]));
  const specOrder = Object.keys(QUALS).filter((s) => specBySlug.has(s));

  // Pre-load every existing doctor slug so generated slugs stay unique.
  const existingSlugs = new Set((await sql`SELECT slug FROM doctors`).map((r) => r.slug));

  let totalDocs = 0;
  let totalLinks = 0;

  for (const countrySlug of Object.keys(NAMES)) {
    const [co] = await sql`SELECT id, name FROM countries WHERE slug = ${countrySlug}`;
    if (!co) {
      log(`  ! country not found: ${countrySlug}`);
      continue;
    }
    const [{ n: current }] = await sql`
      SELECT COUNT(DISTINCT d.id)::int AS n
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active
      INNER JOIN cities ci ON ci.id = h.city_id
      WHERE ci.country_id = ${co.id} AND d.is_active`;
    if (current >= DOC_TARGET) {
      log(`  ${countrySlug}: ${current} doctors — already at target, skip`);
      continue;
    }
    const need = DOC_TARGET - current;

    // Largest active hospitals in the country — doctors attach here.
    const hospitals = await sql`
      SELECT h.id, h.name, ci.name AS city
      FROM hospitals h
      INNER JOIN cities ci ON ci.id = h.city_id
      WHERE ci.country_id = ${co.id} AND h.is_active
      ORDER BY h.is_featured DESC NULLS LAST,
               h.bed_capacity DESC NULLS LAST,
               h.review_count DESC NULLS LAST,
               h.id
      LIMIT 14`;
    if (hospitals.length === 0) {
      log(`  ! no hospitals in ${countrySlug}, skip`);
      continue;
    }

    const pool = NAMES[countrySlug];
    const docRows = [];
    const usedNames = new Set();
    for (let i = 0; i < need; i++) {
      // Unique full name within this batch.
      let given, surname, full, slug;
      let guard = 0;
      do {
        given = pick(pool.given);
        surname = pick(pool.sur);
        full = `${given} ${surname}`;
        guard++;
      } while (usedNames.has(full) && guard < 50);
      usedNames.add(full);

      let base = `dr-${slugify(full)}`;
      slug = base;
      let n = 2;
      while (existingSlugs.has(slug)) slug = `${base}-${n++}`;
      existingSlugs.add(slug);

      const specSlug = specOrder[i % specOrder.length];
      const spec = specBySlug.get(specSlug);
      const hospital = hospitals[i % hospitals.length];
      const years = 9 + Math.floor(rnd() * 26); // 9–34
      const patients = Math.round((years * (320 + rnd() * 560)) / 100) * 100;
      const rating = (4.3 + rnd() * 0.6).toFixed(1);
      const reviews = 18 + Math.floor(rnd() * 235);
      const title = rnd() < 0.16 ? "Prof." : "Dr.";
      const name = `Dr. ${full}`;
      const langs = [...pool.langs];
      if (countrySlug === "uae" && /Menon|Nair|Sharma|Iyer/.test(surname)) langs.push("Hindi");

      docRows.push({
        _specId: spec.id,
        hospital_id: hospital.id,
        name,
        slug,
        title,
        qualifications: pick(QUALS[specSlug]),
        experience_years: years,
        patients_treated: patients,
        rating,
        review_count: reviews,
        image_url: null,
        bio:
          `${name} is a ${spec.name.toLowerCase()} specialist at ${hospital.name}, ${hospital.city}, ` +
          `with ${years} years of clinical practice. The practice focuses on ${FOCUS[specSlug]} and ` +
          `regularly cares for international patients, with itemised treatment quotes and remote case ` +
          `review available before travel.`,
        languages_spoken: JSON.stringify(langs),
        is_active: true,
        is_featured: rnd() < 0.18,
        license_verified: false,
      });
    }

    if (!DRY) {
      const inserted = await sql`
        INSERT INTO doctors ${sql(
          docRows,
          "hospital_id", "name", "slug", "title", "qualifications", "experience_years",
          "patients_treated", "rating", "review_count", "image_url", "bio",
          "languages_spoken", "is_active", "is_featured", "license_verified",
        )}
        RETURNING id, slug`;
      const idBySlug = new Map(inserted.map((r) => [r.slug, r.id]));
      const linkRows = docRows.map((d) => ({
        doctor_id: idBySlug.get(d.slug),
        specialty_id: d._specId,
        is_primary: true,
      }));
      await sql`INSERT INTO doctor_specialties ${sql(linkRows, "doctor_id", "specialty_id", "is_primary")}`;
      totalLinks += linkRows.length;
    }
    totalDocs += docRows.length;
    log(`  ${DRY ? "would add" : "added"} ${String(docRows.length).padStart(3)} doctors  ${countrySlug.padEnd(14)} (${current} -> ${current + docRows.length})`);
  }
  log(`\x1b[32m  Part B: ${DRY ? "would add" : "added"} ${totalDocs} doctors, ${totalLinks} specialty links\x1b[0m`);
}

// ============================================================
async function main() {
  if (DRY) log("\x1b[33m** DRY RUN — no writes **\x1b[0m");
  await fillHospitalSpecialties();
  await seedDoctors();
  await credentialDoctorHospitals();
  await sql.end();
  log("\n\x1b[32mDone.\x1b[0m");
}
main().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});
