/**
 * Wikidata bulk image import — inverse approach.
 *
 * Instead of searching Wikidata for each of our hospital names (slow + low yield
 * because most non-flagship hospitals don't return useful matches), this:
 *   1. Pulls *every* Wikidata entity that is `wdt:P31 wd:Q16917` (instance of
 *      hospital) AND has a P18 image AND a country in our 9 destinations.
 *   2. Indexes them by normalized name + country.
 *   3. Walks our hospitals table and matches.
 *
 * Should run in 2-3 minutes (one big SPARQL → in-memory match → batch write).
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/wikidata-image-bulk.ts
 */
import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");

const COUNTRY_QIDS: Record<string, string> = {
  india: "Q668",
  thailand: "Q869",
  turkey: "Q43",
  germany: "Q183",
  "south-korea": "Q884",
  malaysia: "Q833",
  singapore: "Q334",
  uae: "Q878",
  "saudi-arabia": "Q851",
};

// Wikidata "instance of" classes that mean "hospital"
const HOSPITAL_QIDS = ["Q16917", "Q1774898", "Q42889569", "Q1320350", "Q189004"];

type Candidate = { name: string; country: string; image: string };

async function fetchAllHospitalImages(): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const [country, qid] of Object.entries(COUNTRY_QIDS)) {
    const sparql = `
      SELECT ?item ?itemLabel ?image WHERE {
        VALUES ?type { ${HOSPITAL_QIDS.map((q) => `wd:${q}`).join(" ")} }
        ?item wdt:P31/wdt:P279* ?type ;
              wdt:P17 wd:${qid} ;
              wdt:P18 ?image .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" }
      }
      LIMIT 5000
    `;
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    console.log(`fetching ${country} (${qid})…`);
    type SparqlResp = {
      results?: { bindings?: { itemLabel?: { value: string }; image?: { value: string } }[] };
    };
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MedCastsBot/1.0 (https://medcasts.com)",
        Accept: "application/sparql-results+json",
      },
    });
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} for ${country}`);
      continue;
    }
    let json: SparqlResp;
    try {
      // Some country results contain stray control bytes that break strict
      // JSON.parse — strip them defensively.
      const text = (await res.text()).replace(/[\x00-\x1f]/g, " ");
      json = JSON.parse(text) as SparqlResp;
    } catch (e) {
      console.warn(`  JSON parse failed for ${country}: ${(e as Error).message}`);
      continue;
    }
    const rows = json.results?.bindings ?? [];
    for (const r of rows) {
      const name = r.itemLabel?.value;
      const image = r.image?.value;
      if (!name || !image) continue;
      out.push({ name, country, image });
    }
    console.log(`  got ${rows.length} hospital-with-image entities for ${country}`);
    // Be polite to Wikidata
    await new Promise((r) => setTimeout(r, 500));
  }
  return out;
}

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9฀-๿ㄱ-힝ऀ-ॿ؀-ۿÀ-ÿ\s]+/g, " ")
    .replace(/\b(hospital|clinic|medical|center|centre|institute|the|of|and|amp)\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function tokensOf(s: string): Set<string> {
  return new Set(
    normalizeKey(s)
      .split(" ")
      .filter((t) => t.length > 2),
  );
}

function tokensMatch(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let common = 0;
  for (const t of a) if (b.has(t)) common++;
  const min = Math.min(a.size, b.size);
  return common / min >= 0.6;
}

function isLikelyBuilding(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("logo")) return false;
  if (u.includes("flag")) return false;
  if (u.includes("seal")) return false;
  if (u.endsWith(".svg")) return false;
  return true;
}

async function probeImage(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "MedCastsBot/1.0" },
    });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return false;
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > 0 && len < 25_000) return false;
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const sql = postgres(process.env.DATABASE_URL);

  console.log("[1/3] fetching Wikidata hospital-with-image candidates…");
  const candidates = await fetchAllHospitalImages();
  console.log(`got ${candidates.length} total candidates across 9 countries`);

  // Index candidates by country → tokens
  const byCountry = new Map<string, { tokens: Set<string>; cand: Candidate }[]>();
  for (const c of candidates) {
    if (!isLikelyBuilding(c.image)) continue;
    const arr = byCountry.get(c.country) ?? [];
    arr.push({ tokens: tokensOf(c.name), cand: c });
    byCountry.set(c.country, arr);
  }

  console.log("[2/3] loading hospitals still on Unsplash fallback…");
  const rows = await sql<{ id: number; name: string; country_slug: string }[]>`
    SELECT h.id, h.name, co.slug AS country_slug
    FROM hospitals h
    JOIN cities c ON c.id = h.city_id
    JOIN countries co ON co.id = c.country_id
    WHERE h.is_active = true
      AND h.cover_image_url LIKE '%images.unsplash.com%'
  `;
  console.log(`${rows.length} hospitals to match`);

  console.log("[3/3] matching by token overlap (≥60%, same country)…");
  const matches: { id: number; image: string; matchedTo: string }[] = [];
  for (const r of rows) {
    const pool = byCountry.get(r.country_slug) ?? [];
    if (pool.length === 0) continue;
    const dbTokens = tokensOf(r.name);
    if (dbTokens.size === 0) continue;
    let bestOverlap = 0;
    let best: { tokens: Set<string>; cand: Candidate } | null = null;
    for (const p of pool) {
      let common = 0;
      for (const t of dbTokens) if (p.tokens.has(t)) common++;
      const min = Math.min(dbTokens.size, p.tokens.size);
      const ratio = common / min;
      if (ratio > bestOverlap && ratio >= 0.6) {
        bestOverlap = ratio;
        best = p;
      }
    }
    if (best) {
      matches.push({ id: r.id, image: best.cand.image, matchedTo: best.cand.name });
    }
  }

  console.log(`${matches.length} hospitals matched by name + country`);

  // Probe each match URL — Wikidata lists URLs but some are 404 / dead
  console.log("[4/4] probing match URLs to filter dead links…");
  const live: typeof matches = [];
  for (let i = 0; i < matches.length; i += 12) {
    const slice = matches.slice(i, i + 12);
    const results = await Promise.all(slice.map((m) => probeImage(m.image).then((ok) => ({ m, ok }))));
    for (const { m, ok } of results) if (ok) live.push(m);
    if (i % 60 === 0) console.log(`  probed ${Math.min(i + 12, matches.length)}/${matches.length} · ${live.length} live`);
  }
  console.log(`${live.length} live image URLs ready to write`);

  if (DRY) {
    console.log("DRY RUN — nothing written.");
    await sql.end();
    return;
  }

  if (live.length > 0) {
    const CHUNK = 200;
    let written = 0;
    for (let i = 0; i < live.length; i += CHUNK) {
      const c = live.slice(i, i + CHUNK);
      await sql.unsafe(
        `UPDATE hospitals h SET cover_image_url = x.url, updated_at = now()
         FROM unnest($1::int[], $2::text[]) AS x(id, url)
         WHERE h.id = x.id AND h.cover_image_url LIKE '%images.unsplash.com%'`,
        [c.map((m) => m.id), c.map((m) => m.image)],
      );
      written += c.length;
      console.log(`  flushed ${written}/${live.length}`);
    }
    console.log(`\ndone. wrote ${written} real photos via Wikidata.`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
