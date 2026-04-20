/**
 * Batch 3 — Seed hospital_treatments with country-median pricing.
 *
 * Strategy:
 *   - Per-treatment baseline USD range (India reference).
 *   - Per-country multiplier.
 *   - For each hospital: seed treatments whose specialty matches any of the
 *     hospital's assigned specialties. Cap at TOP_N_TREATMENTS per hospital
 *     (prioritizing flagship procedures) to keep DB size sane.
 *   - Per-hospital variance (±10%) around the country median so prices look
 *     organic rather than identical.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/seed-hospital-pricing.ts
 *
 * Flags:
 *   --dry-run
 *   --country=india
 *   --limit=500          hospital cap
 *   --top=5              treatments per hospital (default 6)
 */

import postgres from "postgres";

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_COUNTRY = arg("--country=");
const HOSP_LIMIT = Number(arg("--limit=") ?? 0);
const TOP_N_TREATMENTS = Number(arg("--top=") ?? 6);

function arg(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a?.slice(prefix.length);
}

// India baseline USD ranges (min, max) for each treatment slug.
// Sourced from published medical-tourism ranges (ballpark; per-hospital
// variance is applied on top).
const BASELINE: Record<string, [number, number]> = {
  // CARDIAC
  "angioplasty-stent": [4000, 7000],
  "heart-valve-replacement": [7500, 12000],
  "cabg-heart-bypass": [6500, 11000],
  "heart-transplant": [70000, 120000],
  "cardiac-ablation": [5000, 9000],
  "pacemaker-implantation": [4000, 7000],
  "tavi-tavr": [22000, 30000],
  "mitral-valve-repair": [8500, 13000],
  "pediatric-cardiac-surgery": [7500, 15000],
  // ORTHOPEDICS
  "robotic-knee-replacement": [9000, 14000],
  "shoulder-replacement": [6500, 10000],
  "acl-reconstruction": [2500, 4500],
  "scoliosis-correction": [9000, 15000],
  "hip-replacement": [6500, 10000],
  "spine-surgery": [5500, 11000],
  "rotator-cuff-repair": [2500, 4500],
  "spinal-fusion": [7000, 12000],
  "microdiscectomy": [3500, 6000],
  "total-knee-replacement": [5500, 8500],
  "bilateral-knee-replacement": [9500, 14500],
  "hip-resurfacing": [7500, 11500],
  // ONCOLOGY
  "proton-beam-therapy": [30000, 55000],
  "cyberknife-radiosurgery": [8500, 14000],
  "bone-marrow-transplant": [32000, 48000],
  "car-t-cell-therapy": [45000, 75000],
  "whipple-procedure": [12000, 20000],
  "mastectomy-reconstruction": [5500, 9500],
  "radical-prostatectomy": [6500, 11000],
  "liver-resection": [10000, 18000],
  "thyroidectomy": [3500, 6000],
  "head-neck-cancer-surgery": [6500, 12000],
  "radiation-therapy-imrt": [4500, 8000],
  "cancer-surgery": [5500, 11000],
  "chemotherapy-cycle": [500, 1500],
  // NEUROLOGY / NEUROSURGERY
  "chiari-decompression": [8500, 14000],
  "brain-tumor-surgery": [7500, 13500],
  "deep-brain-stimulation": [25000, 35000],
  "gamma-knife": [7500, 12000],
  "awake-craniotomy": [10000, 16000],
  "aneurysm-clipping": [9000, 14500],
  "epilepsy-surgery": [12000, 20000],
  "trigeminal-neuralgia-mvd": [8500, 13000],
  "carotid-endarterectomy": [6500, 10500],
  // ORGAN TRANSPLANT
  "lung-transplant": [95000, 150000],
  "liver-transplant": [35000, 55000],
  "kidney-transplant": [14000, 22000],
  "pancreas-transplant": [45000, 70000],
  // GI
  "laparoscopic-gallbladder": [2500, 4500],
  "liver-resection-benign": [8000, 14000],
  "gastric-sleeve": [5500, 8500],
  "colectomy": [6500, 11000],
  "fundoplication": [4500, 7500],
  "hernia-repair": [1800, 3500],
  // COSMETIC
  "bbl-brazilian-butt-lift": [3500, 6500],
  "mommy-makeover": [5500, 9500],
  "breast-augmentation": [3000, 5500],
  "facelift": [4500, 8000],
  "rhinoplasty": [3000, 5500],
  "liposuction": [2500, 4500],
  "hair-transplant-fue": [1500, 3500],
  "tummy-tuck": [3500, 6500],
  // FERTILITY
  "ivf-icsi": [3000, 5500],
  "ivf-donor-egg": [5500, 9000],
  "pgt-embryo-testing": [2500, 4500],
  "surrogacy-gestational": [28000, 55000],
  // OPHTHALMOLOGY
  "cataract-premium-iol": [1800, 3500],
  "retinal-detachment-repair": [3500, 6000],
  "keratoconus-cxl": [1500, 2800],
  "cornea-transplant": [3500, 6500],
  "lasik-smile": [1200, 2500],
  // DENTAL
  "all-on-4-implants": [5500, 9500],
  "veneers-emax-zirconia": [250, 450], // per tooth; represented as unit price
  "full-mouth-rehabilitation": [7500, 14000],
  "all-on-6-implants": [7500, 13000],
  // BARIATRIC
  "gastric-bypass": [6500, 9500],
  "revisional-bariatric": [9500, 14000],
  "mini-gastric-bypass": [5500, 8500],
  // UROLOGY
  "kidney-stone-lithotripsy": [1800, 3500],
  "partial-nephrectomy": [7000, 11500],
  "turp-prostate": [3500, 5500],
  // GYNECOLOGY
  "endometriosis-excision": [4500, 7500],
  "robotic-hysterectomy": [5500, 9000],
  "myomectomy": [4000, 6500],
  // ENT
  "septoplasty-turbinate": [2000, 3500],
  "functional-endoscopic-sinus": [2500, 4500],
  "cochlear-implant": [15000, 25000],
  // PEDIATRIC
  "cleft-lip-palate-repair": [2500, 4500],
  "pediatric-bmt": [35000, 55000],
};

// Country multiplier against India baseline.
const COUNTRY_MULT: Record<string, number> = {
  india: 1.0,
  thailand: 1.3,
  malaysia: 1.25,
  turkey: 1.4,
  "south-korea": 2.0,
  "united-arab-emirates": 2.5,
  "saudi-arabia": 2.3,
  singapore: 3.0,
  germany: 5.0,
};

// Priority order (most-searched / most-trafficked treatments surface first).
const POPULAR_ORDER = new Set([
  "cabg-heart-bypass",
  "angioplasty-stent",
  "total-knee-replacement",
  "hip-replacement",
  "ivf-icsi",
  "hair-transplant-fue",
  "lasik-smile",
  "cataract-premium-iol",
  "gastric-sleeve",
  "gastric-bypass",
  "liver-transplant",
  "kidney-transplant",
  "bone-marrow-transplant",
  "cancer-surgery",
  "rhinoplasty",
  "breast-augmentation",
  "all-on-4-implants",
  "veneers-emax-zirconia",
  "spine-surgery",
  "brain-tumor-surgery",
]);

function jitter(base: number, pct = 0.1): number {
  // deterministic-ish spread; vary ±pct
  const shift = (Math.random() - 0.5) * 2 * pct;
  return Math.round(base * (1 + shift));
}

type HospitalRow = {
  hid: number;
  countrySlug: string;
  specialtyIds: number[];
};

type TreatmentRow = {
  id: number;
  slug: string;
  specialtyId: number;
};

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 4, prepare: false });

  const treatments = await sql<TreatmentRow[]>`
    SELECT id, slug, specialty_id AS "specialtyId" FROM treatments
  `;
  const treatmentsBySpecialty = new Map<number, TreatmentRow[]>();
  for (const t of treatments) {
    const arr = treatmentsBySpecialty.get(t.specialtyId) ?? [];
    arr.push(t);
    treatmentsBySpecialty.set(t.specialtyId, arr);
  }

  const whereCountry = ONLY_COUNTRY ? sql`AND co.slug = ${ONLY_COUNTRY}` : sql``;
  const limitClause = HOSP_LIMIT ? sql`LIMIT ${HOSP_LIMIT}` : sql``;

  const hospitals = await sql<HospitalRow[]>`
    SELECT
      h.id AS hid,
      co.slug AS "countrySlug",
      COALESCE(
        (SELECT ARRAY_AGG(hs.specialty_id ORDER BY hs.is_center_of_excellence DESC)
         FROM hospital_specialties hs WHERE hs.hospital_id = h.id),
        ARRAY[]::int[]
      ) AS "specialtyIds"
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
  const distByTreatment: Record<string, number> = {};
  const distByCountry: Record<string, number> = {};

  const BATCH = 300;
  for (let i = 0; i < hospitals.length; i += BATCH) {
    const slice = hospitals.slice(i, i + BATCH);
    const rows: Array<{
      hid: number;
      tid: number;
      min: number;
      max: number;
      slug: string;
      country: string;
    }> = [];

    for (const h of slice) {
      const mult = COUNTRY_MULT[h.countrySlug] ?? 1.5;

      // Candidate treatments = those whose specialty is in hospital's list.
      const candidates: TreatmentRow[] = [];
      for (const sid of h.specialtyIds) {
        const list = treatmentsBySpecialty.get(sid) ?? [];
        candidates.push(...list);
      }

      // Score: popular first, then arbitrary.
      candidates.sort((a, b) => {
        const ap = POPULAR_ORDER.has(a.slug) ? 0 : 1;
        const bp = POPULAR_ORDER.has(b.slug) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.id - b.id;
      });

      const picked = candidates.slice(0, TOP_N_TREATMENTS);

      for (const t of picked) {
        const base = BASELINE[t.slug];
        if (!base) continue;
        const [lo, hi] = base;
        const min = jitter(lo * mult);
        const max = Math.max(min + 100, jitter(hi * mult));
        rows.push({ hid: h.hid, tid: t.id, min, max, slug: t.slug, country: h.countrySlug });
        distByTreatment[t.slug] = (distByTreatment[t.slug] ?? 0) + 1;
        distByCountry[h.countrySlug] = (distByCountry[h.countrySlug] ?? 0) + 1;
        planned++;
      }
    }

    if (!DRY_RUN && rows.length > 0) {
      const values = rows
        .map((r) => `(${r.hid}, ${r.tid}, ${r.min}, ${r.max}, true)`)
        .join(",");
      await sql.unsafe(`
        INSERT INTO hospital_treatments (hospital_id, treatment_id, cost_min_usd, cost_max_usd, is_active)
        VALUES ${values}
        ON CONFLICT (hospital_id, treatment_id) DO NOTHING
      `);
      written += rows.length;
    }

    process.stdout.write(`\r  processed ${Math.min(i + BATCH, hospitals.length)}/${hospitals.length} · planned ${planned}`);
  }
  console.log();

  const topTreat = Object.entries(distByTreatment).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log("\nTop treatments by coverage:");
  for (const [s, n] of topTreat) console.log(`  ${s.padEnd(34)} ${n}`);

  console.log("\nBy country:");
  for (const [c, n] of Object.entries(distByCountry).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c.padEnd(24)} ${n}`);
  }

  console.log(`\nRows planned: ${planned}`);
  if (!DRY_RUN) console.log(`Rows attempted insert: ${written}`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
