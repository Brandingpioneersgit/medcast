/**
 * Fix hospitals stuck in "Unknown" city slugs by reverse-geocoding their
 * coordinates through the free OSM Nominatim service.
 *
 * Nominatim rate limit: 1 req/sec, user-agent required. Our sleep is 1100ms.
 *
 * For each candidate hospital:
 *   1. GET reverse?lat=...&lon=...&format=jsonv2
 *   2. Pull the best city-like name from `.address` (city | town | municipality
 *      | county | state_district | state).
 *   3. Upsert that city under the hospital's country.
 *   4. Repoint the hospital's city_id.
 *
 * Flags:
 *   --dry-run           Print resolved (hospital → city), write nothing.
 *   --country=<slug>    Single destination country.
 *   --limit=<n>         Cap per run (useful for testing).
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const UA = "medcasts-data-importer/1.0 (https://medcasts.com; contact@medcasts.com)";

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_COUNTRY = arg("--country=");
const LIMIT = Number(arg("--limit=") ?? 0) || undefined;

function arg(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a?.slice(prefix.length);
}

function kebab(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Address = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country_code?: string;
};

async function reverse(lat: string, lon: string): Promise<Address | null> {
  const url = `${NOMINATIM}?lat=${lat}&lon=${lon}&format=jsonv2&accept-language=en&zoom=10&addressdetails=1`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.status === 429) {
        await sleep(15000);
        continue;
      }
      if (!r.ok) return null;
      const j = (await r.json()) as { address?: Address };
      return j.address ?? null;
    } catch {
      await sleep(3000 * (i + 1));
    }
  }
  return null;
}

function pickCity(a: Address): string | null {
  return (
    a.city ||
    a.town ||
    a.municipality ||
    a.village ||
    a.county ||
    a.state_district ||
    a.state ||
    null
  );
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 2, prepare: false });

  const destCountries = await sql`
    SELECT id, name, slug, iso_code FROM countries WHERE is_destination = true ORDER BY id
  `;
  const targets = ONLY_COUNTRY
    ? destCountries.filter((c: any) => c.slug === ONLY_COUNTRY)
    : destCountries;

  let totalFixed = 0;
  let totalFailed = 0;
  let totalNoCoord = 0;

  for (const country of targets) {
    console.log(`\n--- ${country.name} ---`);
    const candidates = await sql<
      { id: number; slug: string; name: string; latitude: string | null; longitude: string | null }[]
    >`
      SELECT h.id, h.slug, h.name, h.latitude::text, h.longitude::text
      FROM hospitals h
      JOIN cities c ON c.id = h.city_id
      WHERE c.country_id = ${country.id}
        AND c.slug = 'unknown'
      ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
    `;
    console.log(`  ${candidates.length} hospitals in 'unknown' city`);
    if (!candidates.length) continue;

    // Keep a cache of slug → cityId for this country to avoid duplicate upserts.
    const cityCache = new Map<string, number>();

    let fixed = 0,
      failed = 0,
      noCoord = 0;

    for (const h of candidates) {
      if (!h.latitude || !h.longitude) {
        noCoord++;
        continue;
      }

      const addr = await reverse(h.latitude, h.longitude);
      const cityName = addr ? pickCity(addr) : null;
      if (!cityName) {
        failed++;
        await sleep(1100);
        continue;
      }
      const citySlug = kebab(cityName);
      if (!citySlug) {
        failed++;
        await sleep(1100);
        continue;
      }

      if (DRY_RUN) {
        console.log(`  ${h.slug}  →  ${cityName}`);
        await sleep(1100);
        fixed++;
        continue;
      }

      let cityId = cityCache.get(citySlug);
      if (!cityId) {
        const existing = await sql<{ id: number }[]>`
          SELECT id FROM cities WHERE country_id = ${country.id} AND slug = ${citySlug} LIMIT 1
        `;
        if (existing.length) {
          cityId = existing[0].id;
        } else {
          const ins = await sql<{ id: number }[]>`
            INSERT INTO cities (country_id, name, slug, latitude, longitude)
            VALUES (${country.id}, ${cityName}, ${citySlug}, ${h.latitude}, ${h.longitude})
            RETURNING id
          `;
          cityId = ins[0].id;
        }
        cityCache.set(citySlug, cityId);
      }

      await sql`UPDATE hospitals SET city_id = ${cityId}, updated_at = NOW() WHERE id = ${h.id}`;
      fixed++;
      await sleep(1100);
    }

    console.log(`  → fixed ${fixed}, failed ${failed}, no-coord ${noCoord}`);
    totalFixed += fixed;
    totalFailed += failed;
    totalNoCoord += noCoord;
  }

  console.log(
    `\nDone. Fixed ${totalFixed}, failed ${totalFailed}, no-coord ${totalNoCoord}.`
  );
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
