/**
 * Batch 2 — Hospital description + metaTitle + metaDescription.
 *
 * Second pass: rewrites the templated descriptions from the first pass using
 * more varied, less AI-patterned copy. Preserves Wikipedia-sourced descriptions.
 *
 * Detection strategy: first-pass outputs contained the phrase
 * "treats both domestic and international patients". Rows matching this
 * signature are rewritten; others (Wikipedia rows, or later hand-edits) are left alone.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/template-hospital-descriptions.ts
 * Flags:
 *   --dry-run
 *   --limit=500
 *   --country=india
 *   --force-all    also overwrite non-templated rows (use with care)
 */

import postgres from "postgres";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE_ALL = process.argv.includes("--force-all");
const LIMIT = Number(arg("--limit=") ?? 0);
const ONLY_COUNTRY = arg("--country=");

function arg(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a?.slice(prefix.length);
}

type Row = {
  id: number;
  name: string;
  cityName: string;
  countryName: string;
  countrySlug: string;
  establishedYear: number | null;
  bedCapacity: number | null;
  specialties: string[];
  accreditations: string[];
};

// Country-specific flavor text used in opener + closer variants.
// Kept short and factually grounded so duplication across pages isn't dense.
const COUNTRY_CONTEXT: Record<
  string,
  { hub: string; strength: string; originRegions: string[] }
> = {
  india: {
    hub: "one of India's major medical-travel destinations",
    strength: "cardiac care, orthopedics, oncology, and organ transplants",
    originRegions: ["Bangladesh", "the Gulf", "East Africa", "South-East Asia"],
  },
  thailand: {
    hub: "a long-established medical-tourism market in South-East Asia",
    strength: "cosmetic surgery, fertility, and gender-affirming care",
    originRegions: ["Australia", "the Gulf", "Europe", "neighbouring ASEAN countries"],
  },
  turkey: {
    hub: "a fast-growing hub for treatment travel out of Europe and the Gulf",
    strength: "hair restoration, bariatric surgery, dental work, and eye care",
    originRegions: ["the UK", "Germany", "the Gulf", "North Africa"],
  },
  germany: {
    hub: "a reference market for complex European medical travel",
    strength: "oncology, neurosurgery, and organ transplantation",
    originRegions: ["Russia", "the CIS states", "the Gulf", "Eastern Europe"],
  },
  "south-korea": {
    hub: "a growing destination for Asian medical tourists",
    strength: "cosmetic surgery, dental implants, and stem-cell work",
    originRegions: ["China", "Japan", "South-East Asia", "the Gulf"],
  },
  malaysia: {
    hub: "a mid-cost Asian option coordinated through the MHTC",
    strength: "cardiology, fertility, and oncology packages",
    originRegions: ["Indonesia", "Bangladesh", "Vietnam", "the Gulf"],
  },
  singapore: {
    hub: "a premium Asian destination used mostly for second opinions and complex cases",
    strength: "oncology, transplants, and rare-disease referrals",
    originRegions: ["Indonesia", "Vietnam", "Myanmar", "Malaysia"],
  },
  "united-arab-emirates": {
    hub: "a Gulf medical market centred on Dubai and Abu Dhabi",
    strength: "cardiology, fertility, and cosmetic procedures",
    originRegions: ["the wider Gulf", "North Africa", "East Africa", "South Asia"],
  },
  "saudi-arabia": {
    hub: "a regional Gulf healthcare market",
    strength: "cardiac surgery, urology, and women's health",
    originRegions: ["the wider Gulf", "Yemen", "North Africa", "East Africa"],
  },
};

function articleFor(country: string): string {
  return /^united|^czech|^russian|^netherlands|^philippines/i.test(country) ? "the " : "";
}

function listSpecialties(names: string[], max = 3): string {
  const picked = names.slice(0, max).map((s) => s.toLowerCase());
  if (picked.length === 0) return "a range of clinical specialties";
  if (picked.length === 1) return picked[0];
  if (picked.length === 2) return `${picked[0]} and ${picked[1]}`;
  return `${picked.slice(0, -1).join(", ")}, and ${picked[picked.length - 1]}`;
}

// 6 opener patterns, selected deterministically by hospital ID.
function opener(r: Row, i: number): string {
  const country = `${articleFor(r.countryName)}${r.countryName}`;
  const ctx = COUNTRY_CONTEXT[r.countrySlug];
  const topSpec = r.specialties[0]?.toLowerCase();
  const bedBlurb = r.bedCapacity ? `${r.bedCapacity}-bed ` : "";
  const yearSentence = r.establishedYear ? ` It opened in ${r.establishedYear}.` : "";
  const hasRealCity = r.cityName && r.cityName.toLowerCase() !== "unknown";
  const place = hasRealCity ? `${r.cityName}, ${country}` : country;

  switch (i % 6) {
    case 0:
      return `${r.name} operates in ${place}${ctx ? `, ${ctx.hub}` : ""}. It handles a mix of domestic and international cases.${yearSentence}`;
    case 1: {
      const where = hasRealCity ? `Based in ${r.cityName}, ` : "";
      return `${where}${r.name} is a ${bedBlurb}hospital working across ${r.specialties.length} clinical specialties.${yearSentence}`;
    }
    case 2: {
      const region = ctx?.originRegions[0] ?? "nearby countries";
      const loc = hasRealCity ? `${r.cityName}'s healthcare corridor` : `${country}'s medical-travel market`;
      return `${r.name} sits in ${loc}. Patients on the international desk tend to travel in from ${region} and beyond.${yearSentence}`;
    }
    case 3: {
      const scope = topSpec
        ? `with ${topSpec} among its busier departments`
        : `across several inpatient departments`;
      const placeFrag = hasRealCity ? `a ${r.cityName}` : "a";
      return `${r.name} — ${placeFrag} hospital ${scope}.${yearSentence}`;
    }
    case 4:
      return `${r.name} runs from ${place}. Patients travel here primarily for ${topSpec ?? "inpatient care"}.${yearSentence}`;
    default: {
      const lead = topSpec ?? "surgical referrals";
      const loc = hasRealCity ? `In ${r.cityName}, ` : "";
      return `${loc}${r.name} is one of the hospitals international coordinators routinely shortlist for ${lead}.${yearSentence}`;
    }
  }
}

// 4 middle variants: specialties + accreditation + bed info, varied.
function middle(r: Row, i: number): string {
  const specList = listSpecialties(r.specialties, 3);
  const accreds = r.accreditations.slice(0, 2);
  const hasAccred = accreds.length > 0;
  const hasBeds = !!r.bedCapacity;

  switch (i % 4) {
    case 0: {
      const spec = `On the clinical side, the hospital covers ${specList}${r.specialties.length > 3 ? ` along with ${r.specialties.length - 3} other specialties` : ""}.`;
      const accr = hasAccred
        ? ` It's accredited by ${accreds.join(" and ")}.`
        : ` Accreditation status isn't published centrally.`;
      const beds = hasBeds ? ` Capacity sits around ${r.bedCapacity} beds.` : "";
      return `${spec}${accr}${beds}`;
    }
    case 1: {
      const spec = hasBeds
        ? `With around ${r.bedCapacity} inpatient beds, core activity runs through ${specList}.`
        : `Core clinical activity runs through ${specList}.`;
      const accr = hasAccred
        ? ` ${accreds.join(" / ")} certification is in place.`
        : "";
      return `${spec}${accr}`;
    }
    case 2: {
      const parts: string[] = [];
      parts.push(`Departments include ${specList}${r.specialties.length > 3 ? ` plus ${r.specialties.length - 3} more` : ""}.`);
      if (hasAccred) parts.push(`Quality marks: ${accreds.join(", ")}.`);
      if (hasBeds) parts.push(`Around ${r.bedCapacity} inpatient beds.`);
      return parts.join(" ");
    }
    default: {
      const spec = `The clinical footprint includes ${specList}.`;
      const accr = hasAccred
        ? ` Third-party accreditation comes via ${accreds.join(" and ")}.`
        : ` Ask for current accreditation paperwork before you travel — not every smaller hospital publishes this online.`;
      return `${spec}${accr}`;
    }
  }
}

// 3 closer variants focused on international-patient logistics, without the
// "coordinated pre-travel consultations" generic LLM phrasing.
function closer(r: Row, i: number): string {
  const ctx = COUNTRY_CONTEXT[r.countrySlug];

  switch (i % 3) {
    case 0:
      return ctx
        ? `Most international patients on the desk arrive from ${ctx.originRegions.slice(0, 2).join(" and ")}, usually for ${ctx.strength.split(",")[0].trim()}.`
        : `The hospital handles visa invitation letters and pickup for overseas patients on request.`;
    case 1:
      return `If you're planning treatment here, expect to share current imaging and a full diagnostic history upfront — the initial quote accuracy depends heavily on that.`;
    default:
      return `On-the-ground support usually covers visa-letter issuance, airport pickup, and post-discharge follow-up, though the level of polish varies — ask your case manager to confirm what this specific hospital includes.`;
  }
}

// Meta description (≤ 158 chars).
function buildMeta(r: Row): string {
  const country = `${articleFor(r.countryName)}${r.countryName}`;
  const hasCity = r.cityName && r.cityName.toLowerCase() !== "unknown";
  const place = hasCity ? `${r.cityName}, ${country}` : country;
  const topTwo = r.specialties.slice(0, 2).map((s) => s.toLowerCase()).join(" · ");
  const accr = r.accreditations[0];
  const parts = [
    `${r.name}, ${place}.`,
    topTwo ? `Care in ${topTwo}.` : "",
    accr ? `${accr} accredited.` : "",
    "Compare packages + get a free quote.",
  ].filter(Boolean);
  let s = parts.join(" ");
  if (s.length > 158) s = s.slice(0, 155) + "...";
  return s;
}

// Meta title (≤ 65 chars).
function buildMetaTitle(r: Row): string {
  const lead = r.specialties[0] ?? "International Patients";
  const hasCity = r.cityName && r.cityName.toLowerCase() !== "unknown";
  const place = hasCity ? r.cityName : r.countryName;
  const core = `${r.name} — ${lead}, ${place}`;
  if (core.length <= 65) return core;
  const short = `${r.name} — ${place}, ${r.countryName}`;
  if (short.length <= 65) return short;
  const tight = `${r.name} — ${place}`;
  return tight.length <= 65 ? tight : r.name.slice(0, 65);
}

function build(r: Row): { desc: string; meta: string; metaTitle: string } {
  const parts = [opener(r, r.id), middle(r, r.id), closer(r, r.id)];
  return {
    desc: parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    meta: buildMeta(r),
    metaTitle: buildMetaTitle(r),
  };
}

// Signature phrases that identify rows written by the first-pass template.
// When rewriting we match these so Wikipedia descriptions are preserved.
const TEMPLATED_SIGNATURES = [
  "treats both domestic and international patients",
  "International patients benefit from coordinated pre-travel",
  "maintains clinical protocols aligned with international",
  "Services include",
  "Staffing handles core activity runs through",
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 4, prepare: false });

  // Build WHERE dynamically as a raw-SQL string with positional params.
  const params: any[] = [];
  const conds: string[] = ["h.is_active = true"];
  if (FORCE_ALL) {
    conds.push("h.description IS NOT NULL");
  } else {
    const likeConds: string[] = ["h.description IS NULL"];
    for (const sig of TEMPLATED_SIGNATURES) {
      params.push(`%${sig}%`);
      likeConds.push(`h.description LIKE $${params.length}`);
    }
    conds.push(`(${likeConds.join(" OR ")})`);
  }
  if (ONLY_COUNTRY) {
    params.push(ONLY_COUNTRY);
    conds.push(`co.slug = $${params.length}`);
  }
  const limitSql = LIMIT ? `LIMIT ${Number(LIMIT)}` : "";

  const query = `
    SELECT
      h.id, h.name,
      ci.name AS "cityName",
      co.name AS "countryName",
      co.slug AS "countrySlug",
      h.established_year AS "establishedYear",
      h.bed_capacity AS "bedCapacity",
      COALESCE(
        (SELECT ARRAY_AGG(s.name ORDER BY hs.is_center_of_excellence DESC, s.sort_order)
         FROM hospital_specialties hs
         JOIN specialties s ON s.id = hs.specialty_id
         WHERE hs.hospital_id = h.id),
        ARRAY[]::text[]
      ) AS specialties,
      COALESCE(
        (SELECT ARRAY_AGG(COALESCE(a.acronym, a.name))
         FROM hospital_accreditations ha
         JOIN accreditations a ON a.id = ha.accreditation_id
         WHERE ha.hospital_id = h.id),
        ARRAY[]::text[]
      ) AS accreditations
    FROM hospitals h
    JOIN cities ci ON ci.id = h.city_id
    JOIN countries co ON co.id = ci.country_id
    WHERE ${conds.join(" AND ")}
    ORDER BY h.id
    ${limitSql}
  `;

  const hospitals = (await sql.unsafe(query, params)) as unknown as Row[];

  console.log(`Scoped ${hospitals.length} hospitals to rewrite.`);

  let written = 0;
  const BATCH = 200;

  for (let i = 0; i < hospitals.length; i += BATCH) {
    const slice = hospitals.slice(i, i + BATCH);
    const updates = slice.map((r) => ({ id: r.id, ...build(r) }));

    if (!DRY_RUN) {
      const values = updates
        .map((u) => `(${u.id}, ${sqlString(u.desc)}, ${sqlString(u.meta)}, ${sqlString(u.metaTitle)})`)
        .join(",");
      await sql.unsafe(`
        UPDATE hospitals h SET
          description = v.description,
          meta_description = v.meta_description,
          meta_title = v.meta_title,
          updated_at = NOW()
        FROM (VALUES ${values}) AS v(id, description, meta_description, meta_title)
        WHERE h.id = v.id
      `);
      written += updates.length;
    }

    if (i === 0 && slice.length > 0) {
      console.log("\nSample (first 3):");
      for (const u of updates.slice(0, 3)) {
        const src = slice.find((r) => r.id === u.id)!;
        console.log(`  ─ ${src.name} (${src.cityName}, ${src.countryName})`);
        console.log(`    ${u.desc}`);
        console.log(`    meta: ${u.meta}`);
        console.log(`    title: ${u.metaTitle}`);
        console.log();
      }
    }

    process.stdout.write(`\r  processed ${Math.min(i + BATCH, hospitals.length)}/${hospitals.length}`);
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
