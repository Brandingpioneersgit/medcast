/**
 * OpenStreetMap (Overpass) hospital importer.
 *
 * For each destination country, queries Overpass for `amenity=hospital`
 * tagged with BOTH `name` AND `website` (the second filter cuts tiny
 * rural clinics without an online presence — a decent proxy for
 * "notable enough to plausibly accept international patients").
 *
 * Run this AFTER wikidata-hospitals.ts. Existing rows are only enriched,
 * never overwritten, so Wikidata data (which has curated labels / images)
 * wins where both sources cover the same hospital.
 *
 * Flags:
 *   --dry-run            Print sample, write nothing.
 *   --country=<slug>     Single destination country slug.
 *   --limit=<n>          Max rows per country (soft cap).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://medcasts:medcasts@localhost:5432/medcasts";
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const UA = "medcasts-data-importer/1.0 (https://medcasts.com)";

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_COUNTRY = arg("--country=");
const PER_COUNTRY_LIMIT = Number(arg("--limit=") ?? 5000);

// Our countries table uses ISO 3166-1 alpha-3 codes; Overpass expects alpha-2.
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  IND: "IN",
  TUR: "TR",
  SGP: "SG",
  THA: "TH",
  ARE: "AE",
  DEU: "DE",
  KOR: "KR",
  MYS: "MY",
  SAU: "SA",
  NGA: "NG",
  KEN: "KE",
  ETH: "ET",
  IRQ: "IQ",
  OMN: "OM",
  UZB: "UZ",
  BGD: "BD",
};

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

/** Truncate by UTF-8 bytes — needed because the embedded PG is SQL_ASCII encoded
 * and counts bytes, not code points, against varchar(N) limits. */
function byteTrim(s: string | undefined, maxBytes: number): string | undefined {
  if (!s) return undefined;
  const buf = Buffer.from(s, "utf8");
  if (buf.length <= maxBytes) return s;
  // Find the last valid UTF-8 boundary at or before maxBytes.
  let end = maxBytes;
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--;
  return buf.slice(0, end).toString("utf8");
}

/** True if the value contains at least two digits and no CJK/Indic scripts —
 * i.e. it actually looks like a phone number, not a mistagged name. */
function looksLikePhone(s: string | undefined): boolean {
  if (!s) return false;
  const digits = (s.match(/\d/g) || []).length;
  if (digits < 2) return false;
  // Reject strings with Devanagari / CJK / Thai / Arabic etc.
  if (/[\u0600-\u06ff\u0900-\u0dff\u0e00-\u0e7f\u4e00-\u9fff\uac00-\ud7af]/.test(s)) return false;
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type OsmTags = Record<string, string>;
type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: OsmTags;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

async function overpassQuery(query: string, tries = 3): Promise<OsmElement[]> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (r.status === 429 || r.status >= 500)
        throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw new Error(`Overpass ${r.status}: ${await r.text()}`);
      const json = (await r.json()) as { elements: OsmElement[] };
      return json.elements;
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(5000 * (i + 1));
    }
  }
  return [];
}

function buildQuery(alpha2: string, limit: number) {
  return `
[out:json][timeout:180];
area["ISO3166-1"="${alpha2}"][admin_level=2]->.a;
(
  node["amenity"="hospital"]["name"]["website"](area.a);
  way["amenity"="hospital"]["name"]["website"](area.a);
  relation["amenity"="hospital"]["name"]["website"](area.a);
);
out center tags ${limit};
`.trim();
}

function centerOf(el: OsmElement): { lat: string; lng: string } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number")
    return { lat: String(el.lat), lng: String(el.lon) };
  if (el.center) return { lat: String(el.center.lat), lng: String(el.center.lon) };
  return null;
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
    console.error("No destination countries found.");
    process.exit(1);
  }

  let totalInserted = 0;
  let totalEnriched = 0;
  let totalSkipped = 0;

  for (const country of targets) {
    const alpha2 = ALPHA3_TO_ALPHA2[country.isoCode];
    if (!alpha2) {
      console.warn(`Skipping ${country.name}: no alpha-2 mapping for ${country.isoCode}`);
      continue;
    }
    console.log(`\n--- ${country.name} (${alpha2}) ---`);
    const elements = await overpassQuery(buildQuery(alpha2, PER_COUNTRY_LIMIT));
    console.log(`  ${elements.length} OSM elements`);

    if (DRY_RUN) {
      for (const el of elements.slice(0, 5)) {
        const t = el.tags ?? {};
        console.log("   ", {
          name: t.name,
          city: t["addr:city"],
          website: t.website,
          phone: t.phone,
          beds: t.beds,
          ...centerOf(el),
        });
      }
      await sleep(1500);
      continue;
    }

    const cityCache = new Map<string, number>();
    let inserted = 0,
      enriched = 0,
      skipped = 0;

    for (const el of elements) {
      const t = el.tags ?? {};
      const name = t.name?.trim();
      if (!name) {
        skipped++;
        continue;
      }

      const coord = centerOf(el);
      const cityName = t["addr:city"]?.trim() || "Unknown";
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
        .select()
        .from(schema.hospitals)
        .where(eq(schema.hospitals.slug, slug))
        .limit(1);

      const websiteRaw = t.website || t["contact:website"];
      const phoneRaw = t.phone || t["contact:phone"];
      const emailRaw = t.email || t["contact:email"];
      const website = byteTrim(websiteRaw, 500);
      const phone = looksLikePhone(phoneRaw) ? byteTrim(phoneRaw, 30) : undefined;
      const email = emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? byteTrim(emailRaw, 255) : undefined;
      const beds = t.beds && /^\d+$/.test(t.beds) ? Number(t.beds) : undefined;
      const addressParts = [
        t["addr:housenumber"],
        t["addr:street"],
        t["addr:suburb"],
        t["addr:city"],
        t["addr:postcode"],
      ].filter(Boolean);
      const address = addressParts.length ? addressParts.join(", ") : undefined;

      if (collision.length) {
        const h = collision[0];
        // Only fill missing fields — Wikidata wins for overlaps.
        const patch: Partial<typeof schema.hospitals.$inferInsert> = {};
        if (!h.latitude && coord?.lat) patch.latitude = coord.lat;
        if (!h.longitude && coord?.lng) patch.longitude = coord.lng;
        if (!h.website && website) patch.website = website;
        if (!h.phone && phone) patch.phone = phone;
        if (!h.email && email) patch.email = email;
        if (!h.address && address) patch.address = byteTrim(address, 2000);
        if (!h.bedCapacity && beds) patch.bedCapacity = beds;
        if (Object.keys(patch).length) {
          patch.updatedAt = new Date();
          await db
            .update(schema.hospitals)
            .set(patch)
            .where(eq(schema.hospitals.id, h.id));
          enriched++;
        } else {
          skipped++;
        }
        continue;
      }

      await db.insert(schema.hospitals).values({
        cityId,
        name: byteTrim(name, 255)!,
        slug: byteTrim(slug, 255)!,
        latitude: coord?.lat,
        longitude: coord?.lng,
        website,
        phone,
        email,
        address: byteTrim(address, 2000),
        bedCapacity: beds,
        isVerified: false,
      });
      inserted++;
    }

    console.log(
      `  → inserted ${inserted}, enriched ${enriched}, skipped ${skipped}`
    );
    totalInserted += inserted;
    totalEnriched += enriched;
    totalSkipped += skipped;
    await sleep(2000);
  }

  console.log(
    `\nDone. Inserted ${totalInserted}, enriched ${totalEnriched}, skipped ${totalSkipped}.`
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
