/**
 * Batch 9 — Doctor bio template.
 *
 * Fills NULL bios and rewrites the clearly-thin ones (< 100 chars, generic phrasing).
 * Preserves Wikipedia-sourced biographical content (typically 300+ chars).
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/template-doctor-bios.ts
 * Flags:
 *   --dry-run
 *   --limit=50
 *   --force-short   also rewrite bios between 100-300 chars (the generic ones)
 */

import postgres from "postgres";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE_SHORT = process.argv.includes("--force-short");
const LIMIT = Number(arg("--limit=") ?? 0);

function arg(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a?.slice(prefix.length);
}

type Row = {
  id: number;
  name: string;
  title: string | null;
  qualifications: string | null;
  experienceYears: number | null;
  patientsTreated: number | null;
  consultationFeeUsd: string | null;
  availableForVideoConsult: boolean | null;
  languagesSpoken: string | null;
  hospitalName: string | null;
  cityName: string | null;
  countryName: string | null;
  specialties: string[];
};

function parseLanguages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function specialtyList(arr: string[]): string {
  const picked = arr.slice(0, 2).map((s) => s.toLowerCase());
  if (picked.length === 0) return "clinical practice";
  if (picked.length === 1) return picked[0];
  return `${picked[0]} and ${picked[1]}`;
}

// Title prefix without double-prefixing.
function titled(r: Row): string {
  const name = r.name.trim();
  if (/^(dr\.|dr |prof\.|prof )/i.test(name)) return name;
  const t = (r.title ?? "Dr.").replace(/\s*$/, "");
  return `${t} ${name}`;
}

function opener(r: Row, i: number): string {
  const tn = titled(r);
  const spec = specialtyList(r.specialties);
  const yrs = r.experienceYears;
  const hospitalLoc =
    r.hospitalName && r.cityName
      ? `${r.hospitalName}, ${r.cityName}`
      : r.hospitalName
        ? r.hospitalName
        : r.cityName
          ? r.cityName
          : null;

  switch (i % 5) {
    case 0:
      return `${tn} practises ${spec}${hospitalLoc ? ` at ${hospitalLoc}` : ""}${yrs ? `, with ${yrs} years in the operating room` : ""}.`;
    case 1:
      return `${tn} is a ${spec} specialist${hospitalLoc ? `, based at ${hospitalLoc}` : ""}.${yrs ? ` Clinical experience: roughly ${yrs} years.` : ""}`;
    case 2: {
      const where = hospitalLoc ? `at ${hospitalLoc}` : "in private practice";
      return `Based ${where}, ${tn} handles ${spec} cases — including the overseas-patient referrals that reach us through MedCasts.`;
    }
    case 3:
      return `${tn} ${yrs ? `has been operating for ${yrs} years,` : "operates"} across ${spec}${hospitalLoc ? `, currently attached to ${hospitalLoc}` : ""}.`;
    default:
      return `${tn} — ${spec} specialist${hospitalLoc ? `, ${hospitalLoc}` : ""}.${yrs ? ` ${yrs}+ years of clinical work.` : ""}`;
  }
}

function middle(r: Row, i: number): string {
  const parts: string[] = [];
  if (r.qualifications) {
    parts.push(`Qualifications: ${r.qualifications}.`);
  }
  if (r.patientsTreated && r.patientsTreated > 100) {
    parts.push(`Procedure volume reported at the ${Math.floor(r.patientsTreated / 100) * 100}+ mark.`);
  }
  if (r.specialties.length > 2) {
    const rest = r.specialties
      .slice(2)
      .map((s) => s.toLowerCase())
      .slice(0, 4)
      .join(", ");
    parts.push(`Also handles ${rest}.`);
  }
  return parts.join(" ");
}

function closer(r: Row, i: number): string {
  const langs = parseLanguages(r.languagesSpoken);
  const chunks: string[] = [];

  const video = r.availableForVideoConsult;
  if (video) {
    chunks.push(`Available for video consultations, which helps when you're reviewing a case from abroad before committing to travel.`);
  }

  if (langs.length > 1) {
    const primary = langs[0];
    const rest = langs.slice(1, 3).join(", ");
    chunks.push(`Consultations can be held in ${primary}${rest ? ` (or ${rest})` : ""}.`);
  } else if (langs.length === 1) {
    chunks.push(`Consultations in ${langs[0]}.`);
  }

  if (chunks.length === 0) {
    // Fallback closer — admits we don't have everything.
    switch (i % 2) {
      case 0:
        return `For specific questions — procedure approach, hospital protocols, post-op timeline — request a written consult and we'll route the question through.`;
      default:
        return `Consultation fees and availability vary by case complexity; ask our desk for a current booking window.`;
    }
  }

  return chunks.join(" ");
}

function build(r: Row): string {
  return [opener(r, r.id), middle(r, r.id), closer(r, r.id)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 4, prepare: false });

  // Select rows to rewrite: NULL bio, OR short generic bio (<100 chars),
  // OR (with --force-short) also 100-300 char range.
  const bioFilter = FORCE_SHORT
    ? "(d.bio IS NULL OR LENGTH(d.bio) < 300)"
    : "(d.bio IS NULL OR LENGTH(d.bio) < 100)";

  const limitSql = LIMIT ? `LIMIT ${Number(LIMIT)}` : "";

  const rows = (await sql.unsafe(`
    SELECT
      d.id, d.name, d.title, d.qualifications,
      d.experience_years AS "experienceYears",
      d.patients_treated AS "patientsTreated",
      d.consultation_fee_usd::text AS "consultationFeeUsd",
      d.available_for_video_consult AS "availableForVideoConsult",
      d.languages_spoken AS "languagesSpoken",
      h.name AS "hospitalName",
      ci.name AS "cityName",
      co.name AS "countryName",
      COALESCE(
        (SELECT ARRAY_AGG(s.name ORDER BY s.sort_order)
         FROM doctor_specialties ds
         JOIN specialties s ON s.id = ds.specialty_id
         WHERE ds.doctor_id = d.id),
        ARRAY[]::text[]
      ) AS specialties
    FROM doctors d
    LEFT JOIN hospitals h ON h.id = d.hospital_id
    LEFT JOIN cities ci ON ci.id = h.city_id
    LEFT JOIN countries co ON co.id = ci.country_id
    WHERE d.is_active = true AND ${bioFilter}
    ORDER BY d.id
    ${limitSql}
  `)) as unknown as Row[];

  console.log(`Scoped ${rows.length} doctors.`);

  let written = 0;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const updates = slice.map((r) => ({ id: r.id, bio: build(r) }));

    if (!DRY_RUN) {
      const values = updates.map((u) => `(${u.id}, ${sqlString(u.bio)})`).join(",");
      await sql.unsafe(`
        UPDATE doctors d SET bio = v.bio, updated_at = NOW()
        FROM (VALUES ${values}) AS v(id, bio)
        WHERE d.id = v.id
      `);
      written += updates.length;
    }

    if (i === 0 && slice.length > 0) {
      console.log("\nSample output (first 3):");
      for (const u of updates.slice(0, 3)) {
        const src = slice.find((r) => r.id === u.id)!;
        console.log(`  ─ ${src.name} (${src.hospitalName ?? "no hospital"}, ${src.cityName ?? "?"})`);
        console.log(`    ${u.bio}`);
        console.log();
      }
    }

    process.stdout.write(`\r  processed ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log();
  console.log(`\nRows updated: ${DRY_RUN ? 0 : written}`);

  await sql.end();
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
