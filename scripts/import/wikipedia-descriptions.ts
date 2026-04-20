/**
 * Wikipedia description scraper.
 *
 * For each destination country:
 *   1. SPARQL Wikidata → find hospitals that have an English Wikipedia article.
 *   2. For each, hit Wikipedia REST `page/summary` + `action=query` extract.
 *   3. Match to our `hospitals` row by slug (must also be in the same country).
 *   4. UPDATE description (full intro) + metaDescription (<= 160 chars).
 *
 * Idempotent: re-running refreshes descriptions. Already-filled rows are still
 * updated (lets us re-scrape when Wikipedia gets edited).
 *
 * Flags:
 *   --dry-run           Print matches, do not write.
 *   --country=<slug>    Single destination country.
 *   --only-empty        Only fill rows where description IS NULL.
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const SPARQL = "https://query.wikidata.org/sparql";
const WIKI_REST = "https://en.wikipedia.org/api/rest_v1";
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const UA = "medcasts-data-importer/1.0 (https://medcasts.com; contact@medcasts.com)";

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_EMPTY = process.argv.includes("--only-empty");
const ONLY_COUNTRY = arg("--country=");

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

function byteTrim(s: string, maxBytes: number): string {
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
      const json = (await r.json()) as { results: { bindings: Binding[] } };
      return json.results.bindings;
    } catch (e) {
      if (i === 2) throw e;
      await sleep(2000 * (i + 1));
    }
  }
  return [];
}

/** Find all hospitals in a country that have an English Wikipedia article. */
function hospitalsWithWikiQuery(iso: string) {
  return `
SELECT DISTINCT ?hospital ?hospitalLabel ?article WHERE {
  ?country wdt:P298 "${iso}" .
  ?hospital wdt:P31/wdt:P279* wd:Q16917 ;
            wdt:P17 ?country .
  ?article schema:about ?hospital ;
           schema:inLanguage "en" ;
           schema:isPartOf <https://en.wikipedia.org/> .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
`.trim();
}

/** Wikipedia REST summary: returns extract, description, image, etc. */
async function wikiSummary(title: string): Promise<{
  extract?: string;
  description?: string;
  thumbnail?: string;
} | null> {
  const url = `${WIKI_REST}/page/summary/${encodeURIComponent(title)}?redirect=true`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status === 404) return null;
    if (!r.ok) return null;
    const j = (await r.json()) as {
      extract?: string;
      description?: string;
      thumbnail?: { source?: string };
    };
    return {
      extract: j.extract,
      description: j.description,
      thumbnail: j.thumbnail?.source,
    };
  } catch {
    return null;
  }
}

/** MediaWiki API full-intro extract (longer than REST summary). */
async function wikiIntroExtract(title: string): Promise<string | null> {
  const url = `${WIKI_API}?action=query&prop=extracts&exintro=1&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(title)}&origin=*`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      query?: { pages?: Record<string, { extract?: string }> };
    };
    const pages = j.query?.pages ?? {};
    const first = Object.values(pages)[0];
    return first?.extract?.trim() || null;
  } catch {
    return null;
  }
}

function titleFromArticleUrl(articleUrl: string): string {
  return decodeURIComponent(articleUrl.split("/wiki/")[1]).replace(/_/g, " ");
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 4, prepare: false });

  const destCountries = await sql`
    SELECT id, name, slug, iso_code FROM countries WHERE is_destination = true ORDER BY id
  `;
  const targets = ONLY_COUNTRY
    ? destCountries.filter((c: any) => c.slug === ONLY_COUNTRY)
    : destCountries;

  if (!targets.length) {
    console.error("No destination countries matched.");
    process.exit(1);
  }

  let totalUpdated = 0;
  let totalMissed = 0;
  let totalNoMatch = 0;

  for (const country of targets) {
    console.log(`\n--- ${country.name} (${country.iso_code}) ---`);
    const rows = await sparql(hospitalsWithWikiQuery(country.iso_code));
    console.log(`  ${rows.length} hospitals with en.wikipedia article`);

    // Index this country's hospitals by slug for matching.
    const dbRows = await sql<{ id: number; slug: string; description: string | null }[]>`
      SELECT h.id, h.slug, h.description
      FROM hospitals h
      JOIN cities c ON c.id = h.city_id
      WHERE c.country_id = ${country.id}
    `;
    const bySlug = new Map<string, { id: number; description: string | null }>();
    for (const r of dbRows) bySlug.set(r.slug, { id: r.id, description: r.description });
    console.log(`  ${dbRows.length} hospitals in DB for this country`);

    let updated = 0,
      missed = 0,
      noMatch = 0;

    for (const r of rows) {
      const name = r.hospitalLabel?.value;
      const articleUrl = r.article?.value;
      if (!name || !articleUrl || /^Q\d+$/.test(name)) continue;

      const slug = kebab(name);
      const match = bySlug.get(slug);
      if (!match) {
        noMatch++;
        continue;
      }
      if (ONLY_EMPTY && match.description) continue;

      const title = titleFromArticleUrl(articleUrl);
      const [summary, intro] = await Promise.all([
        wikiSummary(title),
        wikiIntroExtract(title),
      ]);

      const extract = intro || summary?.extract;
      if (!extract) {
        missed++;
        continue;
      }
      const metaDesc = (summary?.description || extract)
        .replace(/\s+/g, " ")
        .slice(0, 157);
      const fullDesc = byteTrim(extract, 8000); // safety cap

      if (DRY_RUN) {
        console.log(`  ✓ ${slug} → ${title} (${extract.length} chars)`);
      } else {
        await sql`
          UPDATE hospitals
          SET description = ${fullDesc},
              meta_description = ${metaDesc},
              cover_image_url = COALESCE(cover_image_url, ${summary?.thumbnail ?? null}),
              updated_at = NOW()
          WHERE id = ${match.id}
        `;
      }
      updated++;
      // 10 req/sec budget for Wikipedia REST.
      await sleep(120);
    }

    console.log(`  → updated ${updated}, missed-extract ${missed}, no-db-match ${noMatch}`);
    totalUpdated += updated;
    totalMissed += missed;
    totalNoMatch += noMatch;
  }

  console.log(
    `\nDone. Updated ${totalUpdated}, missed ${totalMissed}, no-match ${totalNoMatch}.`
  );
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
