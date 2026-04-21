/**
 * Batch 2 FAQ seed: conditions, countries, top-100 hospitals.
 *
 * Adds FAQPage schema coverage to pages that had none.
 *
 * Run: node --env-file=.env.local --import tsx scripts/import/seed-faqs-batch2.ts
 * Flags: --dry-run | --conditions-only | --countries-only | --hospitals-only
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const CONDITIONS_ONLY = process.argv.includes("--conditions-only");
const COUNTRIES_ONLY = process.argv.includes("--countries-only");
const HOSPITALS_ONLY = process.argv.includes("--hospitals-only");

type Condition = {
  id: number;
  slug: string;
  name: string;
  severityLevel: string | null;
  specialtyName: string | null;
  topTreatments: string[];
};
type Country = { id: number; slug: string; name: string };
type Hospital = {
  id: number;
  slug: string;
  name: string;
  cityName: string | null;
  countryName: string | null;
  countrySlug: string | null;
  specialties: string[];
};

function conditionFaqs(c: Condition): { q: string; a: string }[] {
  const nameLower = c.name.toLowerCase();
  const specialty = c.specialtyName ?? "";
  const treatList = c.topTreatments.slice(0, 3).join(", ") || "conservative and procedural options";
  const sev = c.severityLevel?.toLowerCase();
  return [
    {
      q: `When should I see a specialist about ${nameLower}?`,
      a: `Escalate to a specialist when symptoms don't respond to initial medical management, when imaging or labs show progression, or when the condition affects quality of life day-to-day. ${sev === "severe" ? "Severe-category conditions like this one are time-sensitive — don't delay." : "Early referral gives you more treatment options than late referral."}`,
    },
    {
      q: `What treatment options exist for ${nameLower}?`,
      a: `Typical options we route international patients for include ${treatList}. Which fits depends on severity, prior treatments tried, and your overall clinical picture — a multidisciplinary second opinion often changes the initial recommendation.`,
    },
    {
      q: `Is ${nameLower} typically treated with surgery?`,
      a: `Not always — most ${specialty ? specialty.toLowerCase() + " " : ""}conditions have both medical and procedural paths. Surgery is usually the recommended path when conservative management has failed, imaging shows structural damage, or the condition is progressive. Ask specifically: what happens if I wait 6 more months on medical management?`,
    },
    {
      q: `How much does treating ${nameLower} abroad cost?`,
      a: `Costs vary 3-10× between destinations. India leads on cost for most procedures, Germany on complex revisions, Singapore and Korea on second opinions. Our quotes break down surgeon fee, anesthesia, stay, and follow-up line-by-line before you commit.`,
    },
    {
      q: `Can I get a second opinion before committing to treatment?`,
      a: `Yes — free across our panel. Share imaging + current plan; we route to a multidisciplinary board and return a written opinion in 5-10 working days with no obligation to travel.`,
    },
  ];
}

function countryFaqs(c: Country): { q: string; a: string }[] {
  const name = c.name;
  return [
    {
      q: `Is ${name} a good destination for medical travel?`,
      a: `${name} has an established international-patient infrastructure with English-speaking case managers at major hospitals. Pick by the specific surgeon's volume for your procedure, not by destination alone — within any country, outcomes vary enormously between centres.`,
    },
    {
      q: `How much can I save by getting treatment in ${name}?`,
      a: `Typical savings vs US prices: 60-85% for cardiac, joint replacement, and oncology procedures; 40-60% vs UK; 20-50% vs Western Europe. Hair transplant, dental, and cosmetic procedures often sit at 70-90% off US prices. The caveat: if your insurance covers US care, the out-of-pocket math may look different.`,
    },
    {
      q: `Do I need a medical visa for ${name}?`,
      a: `Most destinations issue a dedicated Medical Visa with a 60-90 day validity, extendable, attendant visas included for family. Processing takes 3-10 working days once the hospital issues its invitation letter. Your case manager prepares the full bundle.`,
    },
    {
      q: `What's the follow-up pathway after I fly home from ${name}?`,
      a: `A good hospital handles follow-up via telemedicine + imaging sharing for 90+ days post-op. For complications, the hospital coordinates either remote management or a return visit. Ask specifically about their documented follow-up protocol before booking — ambiguity here is the biggest red flag.`,
    },
    {
      q: `Is the medical equipment in ${name} up to international standards?`,
      a: `Tier-1 hospitals in ${name} run the same equipment as US/UK hospitals — Intuitive da Vinci, Varian linacs, Zeiss surgical platforms. The hardware isn't the differentiator. Staffing ratios, ICU protocols, and surgeon volume matter more than equipment.`,
    },
    {
      q: `Will insurance cover my treatment in ${name}?`,
      a: `Most US/UK insurance plans don't cover elective international care. Gulf and African private insurers often do, at least partially, via direct-billing arrangements with specific hospitals. Self-pay is the most common route — which is why transparent itemised pricing matters.`,
    },
  ];
}

function hospitalFaqs(h: Hospital): { q: string; a: string }[] {
  const name = h.name;
  const place = h.cityName
    ? `${h.cityName}${h.countryName ? `, ${h.countryName}` : ""}`
    : h.countryName ?? "this region";
  const topSpecs = h.specialties.slice(0, 3).join(", ") || "multiple medical specialties";
  return [
    {
      q: `What is ${name} best known for?`,
      a: `${name} has established programs in ${topSpecs}. The hospital accepts international patients through a dedicated case manager who handles visa paperwork, airport pickup, and discharge follow-up.`,
    },
    {
      q: `How much does treatment at ${name} cost?`,
      a: `Cost varies by procedure — we surface itemised ranges per specialty on the hospital page. The package typically includes surgeon, anesthesia, standard ward stay, and first follow-up; implant upgrades, ICU days beyond protocol, and revisions are billed separately. We send a fixed written quote before you commit.`,
    },
    {
      q: `Is ${name} internationally accredited?`,
      a: `We list current accreditations on the hospital page. Ask for the specific accreditation certificate numbers before you commit — accreditation can lapse between renewals, so current-year documentation is what matters.`,
    },
    {
      q: `How do I get a medical visa for treatment at ${name}?`,
      a: `${name} issues the invitation letter your visa application needs within 24-48 hours of confirming the treatment plan. We coordinate the full visa bundle — invitation letter, documentation checklist, embassy-appointment guidance.`,
    },
    {
      q: `What languages are spoken at ${name}?`,
      a: `English is standard across ${place} at tier-1 hospitals. Arabic, Russian, and regional languages are commonly covered by the international patient desk — specific language coverage is listed on the hospital page.`,
    },
  ];
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  let inserted = 0;

  if (!HOSPITALS_ONLY && !COUNTRIES_ONLY) {
    const rows: any[] = await sql`
      SELECT c.id, c.slug, c.name, c.severity_level as "severityLevel",
        (SELECT s.name FROM condition_specialties cs JOIN specialties s ON s.id = cs.specialty_id WHERE cs.condition_id = c.id ORDER BY s.id LIMIT 1) as "specialtyName",
        ARRAY(SELECT t.name FROM condition_treatments ct JOIN treatments t ON t.id = ct.treatment_id WHERE ct.condition_id = c.id ORDER BY ct.is_primary DESC NULLS LAST, t.id LIMIT 5) as "topTreatments"
      FROM conditions c
    `;
    if (!DRY) await sql`DELETE FROM faqs WHERE entity_type = 'condition'`;
    const pairs: any[] = [];
    for (const c of rows as Condition[]) {
      const faqs = conditionFaqs(c);
      faqs.forEach((f, i) => pairs.push({
        entity_type: "condition", entity_id: c.id,
        question: f.q, answer: f.a, sort_order: i, is_active: true,
      }));
    }
    if (!DRY && pairs.length) {
      for (let i = 0; i < pairs.length; i += 500) {
        await sql`INSERT INTO faqs ${sql(pairs.slice(i, i + 500))}`;
      }
    }
    inserted += pairs.length;
    console.log(`conditions: ${rows.length} × FAQs = ${pairs.length} rows`);
  }

  if (!HOSPITALS_ONLY && !CONDITIONS_ONLY) {
    const rows: any[] = await sql`
      SELECT id, slug, name FROM countries WHERE is_destination = true ORDER BY id
    `;
    if (!DRY) await sql`DELETE FROM faqs WHERE entity_type = 'country'`;
    const pairs: any[] = [];
    for (const c of rows as Country[]) {
      const faqs = countryFaqs(c);
      faqs.forEach((f, i) => pairs.push({
        entity_type: "country", entity_id: c.id,
        question: f.q, answer: f.a, sort_order: i, is_active: true,
      }));
    }
    if (!DRY && pairs.length) {
      await sql`INSERT INTO faqs ${sql(pairs)}`;
    }
    inserted += pairs.length;
    console.log(`countries: ${rows.length} × FAQs = ${pairs.length} rows`);
  }

  if (!CONDITIONS_ONLY && !COUNTRIES_ONLY) {
    // Top 100 hospitals by featured + rating + review count
    const rows: any[] = await sql`
      SELECT h.id, h.slug, h.name,
        ci.name as "cityName", co.name as "countryName", co.slug as "countrySlug",
        ARRAY(SELECT s.name FROM hospital_specialties hs JOIN specialties s ON s.id = hs.specialty_id WHERE hs.hospital_id = h.id ORDER BY hs.id LIMIT 5) as specialties
      FROM hospitals h
      LEFT JOIN cities ci ON ci.id = h.city_id
      LEFT JOIN countries co ON co.id = ci.country_id
      WHERE h.is_active = true
      ORDER BY h.is_featured DESC, h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST
      LIMIT 100
    `;
    if (!DRY) await sql`DELETE FROM faqs WHERE entity_type = 'hospital'`;
    const pairs: any[] = [];
    for (const h of rows as Hospital[]) {
      const faqs = hospitalFaqs(h);
      faqs.forEach((f, i) => pairs.push({
        entity_type: "hospital", entity_id: h.id,
        question: f.q, answer: f.a, sort_order: i, is_active: true,
      }));
    }
    if (!DRY && pairs.length) {
      for (let i = 0; i < pairs.length; i += 500) {
        await sql`INSERT INTO faqs ${sql(pairs.slice(i, i + 500))}`;
      }
    }
    inserted += pairs.length;
    console.log(`hospitals: ${rows.length} × FAQs = ${pairs.length} rows`);
  }

  console.log(DRY ? `would insert ${inserted} FAQ rows total` : `inserted ${inserted} FAQ rows total`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
