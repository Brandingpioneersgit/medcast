import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const locales = 8;
  const core = 13; // core routes in sitemap.ts

  const hospitals = Number((await sql`SELECT COUNT(*)::int AS n FROM hospitals WHERE is_active = true`)[0].n);
  const specs = Number((await sql`SELECT COUNT(*)::int AS n FROM specialties WHERE is_active = true`)[0].n);
  const treatments = Number((await sql`SELECT COUNT(*)::int AS n FROM treatments WHERE is_active = true`)[0].n);
  const conditions = Number((await sql`SELECT COUNT(*)::int AS n FROM conditions`)[0].n);
  const doctors = Number((await sql`SELECT COUNT(*)::int AS n FROM doctors WHERE is_active = true`)[0].n);
  const destCountries = Number((await sql`SELECT COUNT(*)::int AS n FROM countries WHERE is_destination = true`)[0].n);
  const destCities = Number((await sql`
    SELECT COUNT(*)::int AS n
    FROM cities ci JOIN countries c ON c.id = ci.country_id
    WHERE c.is_destination = true`)[0].n);
  const combos = Number((await sql`
    SELECT COUNT(*)::int AS n
    FROM hospital_specialties hs
    JOIN hospitals h ON h.id = hs.hospital_id
    JOIN specialties s ON s.id = hs.specialty_id
    WHERE h.is_active = true AND s.is_active = true`)[0].n);
  const blogs = Number((await sql`SELECT COUNT(*)::int AS n FROM blog_posts WHERE status = 'published'`)[0].n);

  const total =
    core * locales
    + hospitals * locales
    + combos * locales
    + treatments * locales
    + treatments * locales /* /cost/ */
    + specs * locales
    + conditions * locales
    + doctors * locales
    + destCountries * locales /* /country/ */
    + destCountries * locales /* /visa/ */
    + destCities * locales /* /city/ */
    + treatments * destCountries * locales /* cost-in-country */
    + blogs * locales;

  console.log("Catalog row counts:");
  console.log(`  hospitals:         ${hospitals.toLocaleString()}`);
  console.log(`  hospital×specialty:${combos.toLocaleString()}`);
  console.log(`  specialties:       ${specs}`);
  console.log(`  treatments:        ${treatments}`);
  console.log(`  conditions:        ${conditions}`);
  console.log(`  doctors:           ${doctors}`);
  console.log(`  destination countries: ${destCountries}`);
  console.log(`  destination cities:    ${destCities}`);
  console.log(`  published blog posts:  ${blogs}`);
  console.log(`\nSitemap URL estimate (8 locales): ${total.toLocaleString()}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
