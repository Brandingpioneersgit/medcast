/**
 * Wikidata doctor importer.
 *
 * For each destination country, SPARQL Wikidata for notable people whose
 * profession (P106) is a medical role AND whose employer (P108) is based in
 * that country. Match the employer to our `hospitals` table by kebab-casing
 * names; only insert the doctor if the employer matches a hospital we know.
 *
 * For each inserted doctor, also hit Wikipedia REST `page/summary` to pull
 * an intro bio + thumbnail photo.
 *
 * Flags:
 *   --dry-run           Print matches, write nothing.
 *   --country=<slug>    Single country.
 *   --limit=<n>         Cap rows per country.
 *   --no-bio            Skip Wikipedia bio fetch (faster).
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const SPARQL = "https://query.wikidata.org/sparql";
const WIKI_REST = "https://en.wikipedia.org/api/rest_v1";
const UA = "medcasts-data-importer/1.0 (https://medcasts.com; contact@medcasts.com)";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_BIO = process.argv.includes("--no-bio");
const ONLY_COUNTRY = arg("--country=");
const LIMIT = Number(arg("--limit=") ?? 2000);

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

function byteTrim(s: string | undefined, maxBytes: number): string | undefined {
  if (!s) return undefined;
  const buf = Buffer.from(s, "utf8");
  if (buf.length <= maxBytes) return s;
  let end = maxBytes;
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--;
  return buf.slice(0, end).toString("utf8");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Binding = Record<string, { value: string } | undefined>;

async function sparql(query: string): Promise<Binding[]> {
  const url = `${SPARQL}?query=${encodeURIComponent(query)}&format=json`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
      });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw new Error(`SPARQL ${r.status}: ${await r.text()}`);
      const j = (await r.json()) as { results: { bindings: Binding[] } };
      return j.results.bindings;
    } catch (e) {
      if (i === 2) throw e;
      await sleep(2000 * (i + 1));
    }
  }
  return [];
}

/**
 * All people who practice a medical profession AND have an employer in the
 * target country. P106 subclass chain catches cardiologists, surgeons,
 * oncologists, etc. via "medical specialist" (Q1758236).
 */
function doctorsQuery(iso: string, limit: number) {
  return `
SELECT DISTINCT ?doctor ?doctorLabel ?image ?employer ?employerLabel ?article WHERE {
  ?country wdt:P298 "${iso}" .
  ?doctor wdt:P31 wd:Q5 .                          # is a human
  ?doctor wdt:P106 ?prof .                          # profession
  ?prof wdt:P279* wd:Q1758236 .                     # subclass of medical specialist
  ?doctor wdt:P108 ?employer .                      # employer
  ?employer wdt:P17 ?country .
  OPTIONAL { ?doctor wdt:P18 ?image }
  OPTIONAL {
    ?article schema:about ?doctor ;
             schema:inLanguage "en" ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT ${limit}
`.trim();
}

/** Broader fallback query: medical profession OR "physician" role, country of citizenship. */
function doctorsBroadQuery(iso: string, limit: number) {
  return `
SELECT DISTINCT ?doctor ?doctorLabel ?image ?employer ?employerLabel ?article WHERE {
  ?country wdt:P298 "${iso}" .
  ?doctor wdt:P31 wd:Q5 .
  {
    ?doctor wdt:P106/wdt:P279* wd:Q39631 .          # physician
  } UNION {
    ?doctor wdt:P106/wdt:P279* wd:Q1415090 .        # surgeon
  }
  ?doctor wdt:P27 ?country .                        # country of citizenship
  OPTIONAL { ?doctor wdt:P108 ?employer . ?employer wdt:P17 ?country }
  OPTIONAL { ?doctor wdt:P18 ?image }
  OPTIONAL {
    ?article schema:about ?doctor ;
             schema:inLanguage "en" ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT ${limit}
`.trim();
}

async function wikiSummary(title: string) {
  try {
    const r = await fetch(`${WIKI_REST}/page/summary/${encodeURIComponent(title)}?redirect=true`, {
      headers: { "User-Agent": UA },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { extract?: string; thumbnail?: { source?: string } };
    return { extract: j.extract, image: j.thumbnail?.source };
  } catch {
    return null;
  }
}

function titleFromArticleUrl(url: string) {
  return decodeURIComponent(url.split("/wiki/")[1] ?? "").replace(/_/g, " ");
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 3, prepare: false });

  const destCountries = await sql`
    SELECT id, name, slug, iso_code FROM countries WHERE is_destination = true ORDER BY id
  `;
  const targets = ONLY_COUNTRY
    ? destCountries.filter((c: any) => c.slug === ONLY_COUNTRY)
    : destCountries;

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalNoMatch = 0;
  let totalSkipped = 0;

  for (const country of targets) {
    console.log(`\n--- ${country.name} (${country.iso_code}) ---`);

    // Pre-fetch our hospitals in this country so we can match employers by name.
    const hospitals = await sql<{ id: number; slug: string; name: string }[]>`
      SELECT h.id, h.slug, h.name
      FROM hospitals h
      JOIN cities c ON c.id = h.city_id
      WHERE c.country_id = ${country.id}
    `;
    const bySlug = new Map<string, { id: number; name: string }>();
    for (const h of hospitals) {
      bySlug.set(h.slug, { id: h.id, name: h.name });
      // Also cache loose variants ("apollo-hospitals" vs "apollo-hospital").
      bySlug.set(h.slug.replace(/-hospitals$/, "-hospital"), { id: h.id, name: h.name });
      bySlug.set(h.slug.replace(/-hospital$/, "-hospitals"), { id: h.id, name: h.name });
    }
    console.log(`  ${hospitals.length} hospitals indexed for matching`);

    let rows = await sparql(doctorsQuery(country.iso_code, LIMIT));
    console.log(`  narrow query: ${rows.length} rows`);
    // Also run the broader query and merge.
    const broad = await sparql(doctorsBroadQuery(country.iso_code, LIMIT));
    console.log(`  broad  query: ${broad.length} rows`);
    const byQid = new Map<string, Binding>();
    for (const r of [...rows, ...broad]) {
      const qid = r.doctor?.value;
      if (!qid) continue;
      const prev = byQid.get(qid);
      const score = (x: Binding) =>
        (x.image ? 1 : 0) + (x.article ? 1 : 0) + (x.employer ? 1 : 0);
      if (!prev || score(r) > score(prev)) byQid.set(qid, r);
    }
    const unique = [...byQid.values()];
    console.log(`  ${unique.length} unique doctors after merge`);

    let inserted = 0,
      updated = 0,
      noMatch = 0,
      skipped = 0;

    for (const r of unique) {
      const name = r.doctorLabel?.value;
      const employerName = r.employerLabel?.value;
      if (!name || /^Q\d+$/.test(name)) {
        skipped++;
        continue;
      }

      // Match employer to one of our hospitals.
      let hospitalId: number | undefined;
      if (employerName && !/^Q\d+$/.test(employerName)) {
        const eSlug = kebab(employerName);
        hospitalId = bySlug.get(eSlug)?.id;
        if (!hospitalId) {
          // Try suffix-tolerant loose match: "apollo-hospitals-delhi" → "apollo-hospitals".
          for (const [k, v] of bySlug.entries()) {
            if (eSlug.includes(k) || k.includes(eSlug)) {
              hospitalId = v.id;
              break;
            }
          }
        }
      }
      if (!hospitalId) {
        noMatch++;
        continue;
      }

      // Build unique slug: start with name; on collision append kebab of country ISO.
      let slug = kebab(name);
      if (!slug) {
        skipped++;
        continue;
      }

      let bio: string | undefined;
      let imageUrl = r.image?.value;
      if (!SKIP_BIO && r.article?.value) {
        const title = titleFromArticleUrl(r.article.value);
        const summary = await wikiSummary(title);
        if (summary?.extract) bio = summary.extract;
        if (!imageUrl && summary?.image) imageUrl = summary.image;
        await sleep(100);
      }

      if (DRY_RUN) {
        console.log(`  ✓ ${name}  →  ${bySlug.get(kebab(employerName || ""))?.name || employerName}  (${bio ? bio.length + " chars bio" : "no bio"})`);
        inserted++;
        continue;
      }

      // Is there already a doctor with this slug?
      const existing = await sql<{ id: number }[]>`
        SELECT id FROM doctors WHERE slug = ${slug} LIMIT 1
      `;

      if (existing.length) {
        await sql`
          UPDATE doctors SET
            hospital_id = COALESCE(hospital_id, ${hospitalId}),
            image_url = COALESCE(image_url, ${imageUrl ?? null}),
            bio = COALESCE(NULLIF(bio, ''), ${bio ?? null}),
            updated_at = NOW()
          WHERE id = ${existing[0].id}
        `;
        updated++;
      } else {
        await sql`
          INSERT INTO doctors (hospital_id, name, slug, title, image_url, bio)
          VALUES (
            ${hospitalId},
            ${byteTrim(name, 255)!},
            ${byteTrim(slug, 255)!},
            'Dr.',
            ${imageUrl ?? null},
            ${bio ? byteTrim(bio, 4000) : null}
          )
        `;
        inserted++;
      }
    }

    console.log(
      `  → inserted ${inserted}, updated ${updated}, no-hospital-match ${noMatch}, skipped ${skipped}`
    );
    totalInserted += inserted;
    totalUpdated += updated;
    totalNoMatch += noMatch;
    totalSkipped += skipped;
    await sleep(1200);
  }

  console.log(
    `\nDone. inserted=${totalInserted} updated=${totalUpdated} no-match=${totalNoMatch} skipped=${totalSkipped}`
  );
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
