import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const revalidate = 86400;

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    "https://medcasts.com"
  ).replace(/\/$/, "");
}

export async function GET() {
  const base = baseUrl();

  const [countriesRow, specialtiesRow, treatmentsRow, hospitalCount] = await Promise.all([
    db
      .select({ slug: s.countries.slug, name: s.countries.name })
      .from(s.countries)
      .where(eq(s.countries.isDestination, true)),
    db
      .select({ slug: s.specialties.slug, name: s.specialties.name })
      .from(s.specialties)
      .where(eq(s.specialties.isActive, true)),
    db
      .select({ slug: s.treatments.slug, name: s.treatments.name })
      .from(s.treatments)
      .where(eq(s.treatments.isActive, true)),
    db.execute<{ n: number }>(sql`SELECT COUNT(*)::int as n FROM ${s.hospitals} WHERE is_active = true`),
  ]).catch(() => [[], [], [], [{ n: 0 }]] as const);

  const totalHospitals = Array.from(hospitalCount)[0]?.n ?? 0;

  const countryLines = countriesRow.map((c) => `- [${c.name}](${base}/en/country/${c.slug})`);
  const specialtyLines = specialtiesRow.map((sp) => `- [${sp.name}](${base}/en/specialty/${sp.slug})`);
  const treatmentLines = treatmentsRow.slice(0, 60).map((t) => `- [${t.name}](${base}/en/treatment/${t.slug})`);

  const body = `# MedCasts

> MedCasts is a medical-tourism platform connecting international patients with accredited hospitals, verified specialists, and transparent treatment pricing across ${countriesRow.length} destination countries.

We currently index ${totalHospitals.toLocaleString()} accredited hospitals and ${treatmentsRow.length} surgical and medical procedures, with content available in 8 languages (English, Arabic, Russian, French, Portuguese, Bengali, Turkish, Hindi).

## Core pages
- [Home](${base}/en)
- [All destinations](${base}/en/countries)
- [All specialties](${base}/en/specialties)
- [All treatments](${base}/en/treatments)
- [All conditions](${base}/en/conditions)
- [All doctors](${base}/en/doctors)
- [All hospitals](${base}/en/hospitals)
- [Compare hospitals, doctors, treatments, countries](${base}/en/compare)
- [Cost calculator](${base}/en/calculator)
- [Free second opinion](${base}/en/second-opinion)
- [24/7 emergency desk](${base}/en/emergency)
- [Medical visa guides](${base}/en/visa/india)
- [Patient journey tracker](${base}/en/journey)
- [Contact / enquiry](${base}/en/contact)

## Destinations
${countryLines.join("\n")}

## Specialties
${specialtyLines.join("\n")}

## Top treatments
${treatmentLines.join("\n")}

## Programmatic landing pages
- \`/en/best/[specialty]-in-[country]\` — ranked list of top hospitals for a specialty in a country (e.g. \`/en/best/cardiac-surgery-in-india\`)
- \`/en/hospital/[slug]\` — individual hospital profile
- \`/en/hospital/[slug]/[specialty]\` — hospital × specialty page (THE key SEO page)
- \`/en/doctor/[slug]\` — doctor profile with booking
- \`/en/treatment/[slug]\` — treatment with hospital pricing
- \`/en/treatment/[slug]/[country]\` — cost of treatment in country
- \`/en/cost/[treatment]\` — all-in cost calculator per treatment
- \`/en/accreditation/[code]\` — list of hospitals holding a given accreditation (JCI, NABH, etc)
- \`/en/country/[slug]\` — destination hub
- \`/en/city/[slug]\` — city hub
- \`/en/condition/[slug]\` — medical-condition page with matching treatments + specialties

## Locales
en (default), ar (RTL), ru, fr, pt, bn, tr, hi — same path with locale prefix (e.g. \`/ar/...\`, \`/hi/...\`).

## Data policies
- All hospitals shown hold current international accreditation.
- All doctor credentials are verified within the past 90 days.
- Patient reviews are moderated before publication.
- Prices are indicative estimates in USD, converted to user's local currency on render.
- We do not publish patient PII, photographs or reports on public pages.

## Contact
- Enquiry form: ${base}/en/contact
- Second opinion: ${base}/en/second-opinion

Last generated: ${new Date().toISOString().slice(0, 10)}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
