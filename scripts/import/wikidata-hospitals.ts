/**
 * Wikidata hospital importer.
 *
 * Queries the public Wikidata SPARQL endpoint for hospitals in each
 * destination country (rows in `countries` with `isDestination=true`),
 * then upserts into `cities` + `hospitals`.
 *
 * Flags:
 *   --dry-run            Print sample rows, write nothing.
 *   --country=<slug>     Limit to a single destination country slug.
 *   --limit=<n>          Max hospitals per country (default 2000).
 *
 * Usage: npx tsx scripts/import/wikidata-hospitals.ts --dry-run --country=thailand
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://medcasts:medcasts@localhost:5432/medcasts";
const ENDPOINT = "https://query.wikidata.org/sparql";
const UA =
  "medcasts-data-importer/1.0 (https://medcasts.com; contact@medcasts.com)";

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_COUNTRY = arg("--country=");
const PER_COUNTRY_LIMIT = Number(arg("--limit=") ?? 2000);

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

function parseCoord(pt: string | undefined) {
  if (!pt) return null;
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(pt);
  if (!m) return null;
  return { lng: m[1], lat: m[2] };
}

type Binding = Record<string, { value: string } | undefined>;

async function querySparql(query: string, tries = 3): Promise<Binding[]> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "application/sparql-results+json",
        },
      });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw new Error(`SPARQL ${r.status}: ${await r.text()}`);
      const json = (await r.json()) as { results: { bindings: Binding[] } };
      return json.results.bindings;
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(2000 * (i + 1));
    }
  }
  return [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildQuery(iso: string, limit: number, offset = 0) {
  return `
SELECT ?hospital ?hospitalLabel ?cityLabel ?coord ?website ?image ?inception WHERE {
  {
    SELECT DISTINCT ?hospital WHERE {
      ?country wdt:P298 "${iso}" .
      ?hospital wdt:P31/wdt:P279* wd:Q16917 ;
                wdt:P17 ?country .
    }
    ORDER BY ?hospital
    LIMIT ${limit} OFFSET ${offset}
  }
  OPTIONAL { ?hospital wdt:P625 ?coord }
  OPTIONAL { ?hospital wdt:P856 ?website }
  OPTIONAL { ?hospital wdt:P18 ?image }
  OPTIONAL { ?hospital wdt:P571 ?inception }
  OPTIONAL {
    ?hospital wdt:P131 ?city .
    ?city wdt:P31/wdt:P279* wd:Q515 .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
`.trim();
}

async function fetchAllForCountry(iso: string, cap: number, pageSize = 1000): Promise<Binding[]> {
  const out: Binding[] = [];
  for (let offset = 0; offset < cap; offset += pageSize) {
    const page = Math.min(pageSize, cap - offset);
    let rows: Binding[] = [];
    try {
      rows = await querySparql(buildQuery(iso, page, offset));
    } catch (e) {
      // Halve the page size once on parse/timeout errors.
      const halved = Math.max(100, Math.floor(page / 2));
      console.warn(`    page at offset ${offset} failed, retrying smaller (${halved})`);
      rows = await querySparql(buildQuery(iso, halved, offset));
      // Continue from halved progress on next iteration.
      offset += halved - pageSize;
    }
    out.push(...rows);
    if (rows.length < page) break; // last page
    await sleep(800);
  }
  return out;
}

async function main() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  const destCountries = await db
    .select()
    .from(schema.countries)
    .where(eq(schema.countries.isDestination, true));
  const targets = ONLY_COUNTRY
    ? destCountries.filter((c) => c.slug === ONLY_COUNTRY)
    : destCountries;

  if (!targets.length) {
    console.error(
      "No destination countries found. Run `npm run db:seed` first, or check --country slug."
    );
    process.exit(1);
  }

  console.log(
    `Querying Wikidata for ${targets.length} countries: ${targets
      .map((c) => c.slug)
      .join(", ")}`
  );

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const country of targets) {
    console.log(`\n--- ${country.name} (${country.isoCode}) ---`);
    const rows = await fetchAllForCountry(country.isoCode, PER_COUNTRY_LIMIT);
    console.log(`  ${rows.length} raw rows`);

    // Dedup by QID, keep the richest row.
    const byQid = new Map<string, Binding>();
    const score = (x: Binding) =>
      (x.coord ? 1 : 0) +
      (x.website ? 1 : 0) +
      (x.image ? 1 : 0) +
      (x.cityLabel ? 1 : 0);
    for (const r of rows) {
      const qid = r.hospital?.value;
      if (!qid) continue;
      const prev = byQid.get(qid);
      if (!prev || score(r) > score(prev)) byQid.set(qid, r);
    }
    const unique = [...byQid.values()];
    console.log(`  ${unique.length} unique after QID dedup`);

    if (DRY_RUN) {
      for (const r of unique.slice(0, 5)) {
        console.log("   ", {
          qid: r.hospital?.value.split("/").pop(),
          name: r.hospitalLabel?.value,
          city: r.cityLabel?.value,
          coord: r.coord?.value,
          website: r.website?.value,
          image: r.image?.value,
        });
      }
      await sleep(1200);
      continue;
    }

    // City cache per country.
    const cityCache = new Map<string, number>();
    let inserted = 0,
      updated = 0,
      skipped = 0;

    for (const r of unique) {
      const name = r.hospitalLabel?.value;
      // Skip rows where label fell back to the QID (no English label).
      if (!name || /^Q\d+$/.test(name)) {
        skipped++;
        continue;
      }
      const coord = parseCoord(r.coord?.value);
      const cityName = r.cityLabel?.value || "Unknown";
      const citySlug = kebab(cityName) || "unknown";

      let cityId = cityCache.get(citySlug);
      if (!cityId) {
        const existing = await db
          .select()
          .from(schema.cities)
          .where(
            and(
              eq(schema.cities.countryId, country.id),
              eq(schema.cities.slug, citySlug)
            )
          )
          .limit(1);
        if (existing.length) {
          cityId = existing[0].id;
        } else {
          const [created] = await db
            .insert(schema.cities)
            .values({
              countryId: country.id,
              name: cityName,
              slug: citySlug,
              latitude: coord?.lat,
              longitude: coord?.lng,
            })
            .returning();
          cityId = created.id;
        }
        cityCache.set(citySlug, cityId);
      }

      const slug = kebab(name);
      if (!slug) {
        skipped++;
        continue;
      }

      const collision = await db
        .select({ id: schema.hospitals.id })
        .from(schema.hospitals)
        .where(eq(schema.hospitals.slug, slug))
        .limit(1);

      const establishedYear = r.inception?.value
        ? new Date(r.inception.value).getFullYear()
        : undefined;

      if (collision.length) {
        await db
          .update(schema.hospitals)
          .set({
            latitude: coord?.lat ?? undefined,
            longitude: coord?.lng ?? undefined,
            website: r.website?.value ?? undefined,
            coverImageUrl: r.image?.value ?? undefined,
            establishedYear,
            updatedAt: new Date(),
          })
          .where(eq(schema.hospitals.id, collision[0].id));
        updated++;
        continue;
      }

      await db.insert(schema.hospitals).values({
        cityId,
        name: name.slice(0, 255),
        slug: slug.slice(0, 255),
        latitude: coord?.lat,
        longitude: coord?.lng,
        website: r.website?.value,
        coverImageUrl: r.image?.value,
        establishedYear,
        isVerified: false,
      });
      inserted++;
    }

    console.log(
      `  → inserted ${inserted}, updated ${updated}, skipped ${skipped}`
    );
    totalInserted += inserted;
    totalUpdated += updated;
    totalSkipped += skipped;

    // Wikidata etiquette: keep under ~5 req/sec.
    await sleep(1200);
  }

  console.log(
    `\nDone. Inserted ${totalInserted}, updated ${totalUpdated}, skipped ${totalSkipped}.`
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
