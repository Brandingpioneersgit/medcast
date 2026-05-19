import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { max: 4, prepare: false, idle_timeout: 30 });
const DRY = process.argv.includes("--dry-run");

// --- Hand-written descriptions for the 3 flagship featured hospitals ----------
const FLAGSHIP = {
  "apollo-hospital-delhi": {
    description: `Indraprastha Apollo is the New Delhi flagship of the Apollo Hospitals group, India's largest private hospital network. The 700-bed quaternary-care facility was the country's first hospital to earn JCI accreditation and is one of the highest-volume centres for cardiac surgery, organ transplant and complex oncology in South Asia.

Its programme depth is unusual even for a hospital of this size. Apollo Delhi houses India's first proton beam therapy centre, a long-running liver and kidney transplant programme, and dedicated units for cardiac sciences, neurosciences, orthopaedics and gastroenterology. International patients are handled through a coordinator desk that manages medical-visa letters, airport transfer and language support.

For overseas patients the appeal is the combination of volume and price — high-acuity procedures here cost a fraction of US or UK rates while being performed by surgeons who handle large annual caseloads. The hospital publishes English-language case files and provides written quotes and surgeon shortlists before any travel is booked. Ask our desk for current pricing and visa-letter turnaround.`,
    metaTitle: "Indraprastha Apollo Hospital, New Delhi — Cost & Quotes",
    metaDescription:
      "Indraprastha Apollo, New Delhi — 700-bed JCI-accredited flagship for cardiac surgery, transplant, proton therapy and oncology. International quotes and visa support.",
  },
  "medanta-medicity": {
    description: `Medanta — The Medicity is a 1,600-bed multi-super-specialty hospital in Gurugram, near New Delhi, founded by the cardiac surgeon Dr Naresh Trehan. It is one of India's largest private medical campuses, built around institutes for heart, neurosciences, cancer, digestive and kidney care.

The hospital is best known internationally for cardiac surgery — its heart institute is among the highest-volume in the region — but it also runs substantial transplant, oncology and orthopaedic programmes, along with an in-house research and academic arm. A dedicated international patient division coordinates referrals, medical visas and accommodation for accompanying family.

Medanta draws patients from across South Asia, Africa and the Gulf, where the draw is access to senior consultants and modern infrastructure at well under Western pricing. The hospital provides itemised written quotes and a clear surgeon shortlist before travel. Ask our desk for current estimates, surgeon availability and visa-letter turnaround.`,
    metaTitle: "Medanta — The Medicity, Gurugram — Cost & Quotes",
    metaDescription:
      "Medanta — The Medicity, Gurugram — 1,600-bed multi-super-specialty hospital founded by Dr Naresh Trehan. Cardiac, transplant, oncology. International quotes and visa support.",
  },
  "max-hospital-saket": {
    description: `Max Super Speciality Hospital, Saket is a 500-bed tertiary-care hospital in south Delhi and one of the flagship sites of the Max Healthcare network. It holds JCI accreditation and is recognised for its cardiac sciences, orthopaedics and oncology programmes.

The Saket campus runs dedicated institutes for heart care, bone and joint surgery, cancer treatment and neurosciences, supported by a kidney and liver transplant programme. International patients are managed through a coordinator team that arranges medical-visa documentation, airport pickup and interpreter support.

Overseas patients choose Max Saket for the mix of accredited quality and the cost advantage typical of Indian private hospitals — major surgery here is priced well below US and UK rates. The hospital issues written quotes and surgeon options before travel is confirmed. Ask our desk for current pricing and visa-letter turnaround.`,
    metaTitle: "Max Super Speciality Hospital, Saket — Cost & Quotes",
    metaDescription:
      "Max Saket, New Delhi — 500-bed JCI-accredited Max Healthcare flagship for cardiac sciences, orthopaedics and oncology. International quotes and visa support.",
  },
};

// --- Template extension for the long-tail thin hospitals ----------------------
const COUNTRY_FRAMING = {
  india: "Indian hospitals at this tier publish English-language case files, take overseas referrals through medical-visa channels, and price elective treatment well below US and UK rates",
  thailand: "Thai facilities of this size handle international patients through dedicated coordinator desks, with most surgeons holding Thai or US/UK board certification",
  turkey: "Turkish hospitals at this level operate under Ministry of Health (USHAŞ) licensing for international patient programmes",
  germany: "German clinics operate under the G-BA quality framework and KTQ accreditation, with detailed pre-op planning before a travelling patient flies in",
  uae: "UAE facilities are regulated by DHA (Dubai) or DOH (Abu Dhabi) and typically offer multilingual case managers for Gulf and East-African patients",
  singapore: "Singapore is regulated by the Ministry of Health under the Healthcare Services Act and is a common stop for complex referrals from across South-East Asia",
  malaysia: "Malaysian hospitals serving overseas patients are MSQH-accredited and typically run an MMC-licensed international patient department",
  "saudi-arabia": "Saudi facilities are regulated by CBAHI and serve a regional referral catchment from across the GCC",
  "south-korea": "Korean hospitals operate under KOIHA accreditation with strong robotic and minimally-invasive programme depth",
};
const pickFraming = (cs) =>
  cs
    ? COUNTRY_FRAMING[cs] ?? COUNTRY_FRAMING.india
    : "It accepts overseas referrals through coordinated case-manager channels, with English-language case files and pre-travel quotes available on request";

function specialtyClause(specs, stub) {
  if (!specs || specs.length === 0) return "";
  if (/clinical (focus|activity)|specialt|\bdepartment/i.test(stub)) return ""; // stub already covers it
  const s = specs.map((x) => x.toLowerCase());
  if (s.length === 1) return ` Clinical focus is ${s[0]}.`;
  if (s.length === 2) return ` Clinical focus spans ${s[0]} and ${s[1]}.`;
  return ` Clinical focus spans ${s[0]}, ${s[1]} and ${s[2]}.`;
}
function accredClause(accs, stub) {
  if (!accs || accs.length === 0) return "";
  if (/accredit|\bJCI\b|\bNABH\b|\bKTQ\b/i.test(stub)) return ""; // stub already covers it
  if (accs.length === 1) return ` ${accs[0]}-accredited.`;
  return ` Accredited under ${accs.slice(0, 3).join(", ")}.`;
}
function bedsClause(beds, stub) {
  if (!beds) return "";
  if (/\d[\d,]*[\s-]?bed/i.test(stub)) return ""; // stub already states a bed count
  if (beds < 50) return ` It runs ${beds} beds — small enough for senior consultants to stay involved across the inpatient stay.`;
  if (beds < 250) return ` The facility operates ${beds} beds across its inpatient wings.`;
  return ` It operates ${beds} beds, with dedicated international-patient floors typical of facilities at this scale.`;
}
function buildExtension(r) {
  const stub = r.description.trim();
  const out = [];
  const loc = [r.cityName, r.countryName].filter(Boolean).join(", ");
  if (loc) {
    out.push(r.establishedYear ? `Founded in ${r.establishedYear}, the hospital sits in ${loc}.` : `The hospital sits in ${loc}.`);
  }
  const tail = `${specialtyClause(r.specialties, stub)}${accredClause(r.accreditations, stub)}${bedsClause(r.bedCapacity, stub)}`.trim();
  if (tail) out.push(tail);
  out.push(`${pickFraming(r.countrySlug)}.`);
  out.push("Ask our desk for a written quote, surgeon shortlist, and current visa-letter turnaround.");
  return out.join(" ").replace(/\s+/g, " ").trim();
}
function buildMeta(r) {
  const loc = [r.cityName, r.countryName].filter(Boolean).join(", ");
  const top = r.specialties && r.specialties[0] ? ` for ${r.specialties[0].toLowerCase()}` : "";
  const c = `${r.name}${loc ? ` in ${loc}` : ""}${top}. International patients welcome — quote, surgeon options and visa support.`;
  return c.length > 158 ? c.slice(0, 155).trimEnd() + "…" : c;
}
function buildMetaTitle(r) {
  const loc = r.cityName ? `, ${r.cityName}` : "";
  const c = `${r.name}${loc} | Medical Travel & Quotes`;
  return c.length > 60 ? `${r.name}${loc}`.slice(0, 60) : c;
}

const HOSPITAL_SELECT = (where) => sql`
  SELECT h.id, h.name, h.slug, h.description,
         h.meta_description AS "metaDescription", h.meta_title AS "metaTitle",
         ci.name AS "cityName", co.name AS "countryName", co.slug AS "countrySlug",
         h.bed_capacity AS "bedCapacity", h.established_year AS "establishedYear",
         COALESCE((SELECT array_agg(s.name ORDER BY hs.is_center_of_excellence DESC, s.sort_order)
                   FROM hospital_specialties hs JOIN specialties s ON s.id = hs.specialty_id
                   WHERE hs.hospital_id = h.id), ARRAY[]::text[]) AS specialties,
         COALESCE((SELECT array_agg(COALESCE(a.acronym, a.name))
                   FROM hospital_accreditations ha JOIN accreditations a ON a.id = ha.accreditation_id
                   WHERE ha.hospital_id = h.id), ARRAY[]::text[]) AS accreditations
  FROM hospitals h JOIN cities ci ON ci.id = h.city_id JOIN countries co ON co.id = ci.country_id
  WHERE h.is_active = true AND ${where}
  ORDER BY h.id`;

// --- Pass 1: flagship hand-written --------------------------------------------
let n1 = 0;
for (const [slug, f] of Object.entries(FLAGSHIP)) {
  if (DRY) { console.log(`flagship ${slug}: ${f.description.length} chars`); continue; }
  const res = await sql`
    UPDATE hospitals SET description = ${f.description}, meta_title = ${f.metaTitle},
      meta_description = ${f.metaDescription}, updated_at = now() WHERE slug = ${slug}`;
  n1 += res.count;
}
console.log(`Pass 1 — flagship descriptions: ${n1} rows`);

// --- Pass 2: extend thin descriptions (<300 chars), excluding flagships --------
const flagshipSlugs = Object.keys(FLAGSHIP);
const thin = await HOSPITAL_SELECT(sql`length(h.description) < 300 AND h.slug <> ALL(${flagshipSlugs})`);
console.log(`Pass 2 — ${thin.length} thin-description hospitals to extend`);
let n2 = 0;
for (const r of thin) {
  const stub = r.description.trim().replace(/\s+/g, " ");
  const ext = buildExtension(r);
  const fullDesc = `${stub}\n\n${ext}`;
  const metaThin = !r.metaDescription || r.metaDescription.length < 50;
  const titleThin = !r.metaTitle || r.metaTitle.length < 10;
  if (DRY) {
    if (n2 < 3) console.log(`\n— ${r.name} (${r.cityName})\n  ${fullDesc}`);
  } else {
    await sql`
      UPDATE hospitals SET description = ${fullDesc},
        meta_description = ${metaThin ? buildMeta(r) : r.metaDescription},
        meta_title = ${titleThin ? buildMetaTitle(r) : r.metaTitle},
        updated_at = now()
      WHERE id = ${r.id}`;
  }
  n2++;
  if (!DRY && n2 % 100 === 0) console.log(`  ...${n2}/${thin.length}`);
}
console.log(`Pass 2 — extended: ${n2} rows`);

// --- Pass 3: meta-only for good-description hospitals with thin meta ----------
const metaOnly = await HOSPITAL_SELECT(
  sql`length(h.description) >= 300 AND (h.meta_description IS NULL OR length(h.meta_description) < 50)`,
);
console.log(`Pass 3 — ${metaOnly.length} good-description hospitals with thin meta`);
let n3 = 0;
for (const r of metaOnly) {
  if (!DRY) {
    const titleThin = !r.metaTitle || r.metaTitle.length < 10;
    await sql`
      UPDATE hospitals SET meta_description = ${buildMeta(r)},
        meta_title = ${titleThin ? buildMetaTitle(r) : r.metaTitle},
        updated_at = now()
      WHERE id = ${r.id}`;
  }
  n3++;
  if (!DRY && n3 % 100 === 0) console.log(`  ...${n3}/${metaOnly.length}`);
}
console.log(`Pass 3 — meta filled: ${n3} rows`);

console.log(`\nTotal: ${n1 + n2 + n3} hospital rows updated.`);
await sql.end();
