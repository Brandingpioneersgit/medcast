/**
 * Wikipedia + Wikidata multi-language image search.
 *
 * Many Asian hospitals only appear on local-language Wikipedia (th, ko, hi,
 * tr, de, ar). This script tries 7 Wikipedia languages plus Wikidata SPARQL
 * for each hospital still on Unsplash fallback.
 *
 *   1. Wikidata search → entity Q-number → P18 (image) statement → Commons URL
 *   2. Wikipedia opensearch in [en, th, ko, hi, tr, de, ar] → REST summary →
 *      originalimage / thumbnail
 *   3. Filter logos / maps / location markers
 *   4. HEAD-probe + DB write
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/wikipedia-multilang-search.ts
 *   ... --limit=8000  --concurrency=10
 */
import postgres from "postgres";

const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? 8000);
const CONCURRENCY = Number(process.argv.find((a) => a.startsWith("--concurrency="))?.slice(14) ?? 10);
const DRY = process.argv.includes("--dry-run");
const REQUEST_TIMEOUT_MS = 8000;

const UA = "MedCastsBot/1.0 (https://medcasts.com; bot@medcasts.com)";

// Map a hospital's destination country to the Wikipedia code most likely to
// have its native-language article.
const COUNTRY_LANGS: Record<string, string[]> = {
  india: ["en", "hi"],
  thailand: ["th", "en"],
  turkey: ["tr", "en"],
  germany: ["de", "en"],
  "south-korea": ["ko", "en"],
  malaysia: ["ms", "en"],
  singapore: ["en"],
  uae: ["en", "ar"],
  "saudi-arabia": ["ar", "en"],
};

type Row = { id: number; slug: string; name: string; country_slug: string };

async function fetchJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function probeImage(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA },
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

function isLikelyBuilding(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("logo")) return false;
  if (u.includes("flag")) return false;
  if (u.includes("seal")) return false;
  if (u.includes("crest")) return false;
  if (u.includes("emblem")) return false;
  if (u.includes("map_of") || u.includes("map-of")) return false;
  if (u.includes("locator")) return false;
  if (u.endsWith(".svg")) return false;
  if (/[\/_-](red|blue|green|yellow|black|white|orange)[\/_-]?(pog|dot|marker|pin)/i.test(u)) return false;
  return true;
}

function normalizeName(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .replace(/\bLtd\.?\b|\bLimited\b|\bLLC\b|\bPvt\.?\b|\bPrivate\b|\bInc\.?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function namesMatch(dbName: string, wikiTitle: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9฀-๿ㄱ-힝ऀ-ॿ؀-ۿÀ-ÿ]+/g, " ")
      .replace(/\b(hospital|clinic|medical|center|centre|institute|the|of|and|amp)\b/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  const a = norm(dbName);
  const b = norm(wikiTitle);
  if (!a || !b) return false;
  if (a === b) return true;
  const aTokens = new Set(a.split(" ").filter((x) => x.length > 2));
  const bTokens = new Set(b.split(" ").filter((x) => x.length > 2));
  if (aTokens.size === 0 || bTokens.size === 0) return false;
  let common = 0;
  for (const t of aTokens) if (bTokens.has(t)) common++;
  const min = Math.min(aTokens.size, bTokens.size);
  return common / min >= 0.55;
}

async function searchInLang(name: string, lang: string): Promise<string[]> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&format=json&limit=3&search=${encodeURIComponent(name)}`;
  type OpenSearch = [string, string[], string[], string[]];
  const data = await fetchJson<OpenSearch>(url);
  return Array.isArray(data) && Array.isArray(data[1]) ? (data[1] as string[]) : [];
}

async function summary(title: string, lang: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  type Summary = {
    type?: string;
    originalimage?: { source: string };
    thumbnail?: { source: string };
  };
  const j = await fetchJson<Summary>(url);
  if (!j || j.type === "disambiguation") return null;
  const cand = j.originalimage?.source ?? j.thumbnail?.source;
  if (!cand || !isLikelyBuilding(cand)) return null;
  return cand;
}

// Wikidata SPARQL for hospital-instance entity matching by label, returns image URL.
async function wikidataLookup(name: string): Promise<string | null> {
  // Wikidata's wbsearchentities is faster than SPARQL for label match
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=${encodeURIComponent(name)}`;
  type WBSearch = { search?: { id: string; label?: string; description?: string }[] };
  const data = await fetchJson<WBSearch>(searchUrl);
  if (!data?.search) return null;

  for (const hit of data.search) {
    // Only look at entities whose description or label suggests it's a hospital
    const desc = (hit.description ?? "").toLowerCase();
    const label = (hit.label ?? "").toLowerCase();
    const isHospitalLike =
      desc.includes("hospital") ||
      desc.includes("clinic") ||
      desc.includes("medical center") ||
      label.includes("hospital");
    if (!isHospitalLike) continue;
    if (!namesMatch(name, hit.label ?? "")) continue;

    // Fetch entity to extract P18
    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${hit.id}&props=claims`;
    type WBEntity = {
      entities?: Record<string, { claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] } }>;
    };
    const entity = await fetchJson<WBEntity>(entityUrl);
    const p18 = entity?.entities?.[hit.id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!p18) continue;
    // Wikidata file value is the bare filename → resolve via Commons Special:FilePath
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18)}`;
    if (isLikelyBuilding(url)) return url;
  }
  return null;
}

async function processOne(row: Row): Promise<{ id: number; url: string | null; source?: string }> {
  const norm = normalizeName(row.name);
  const langs = COUNTRY_LANGS[row.country_slug] ?? ["en"];

  // 1. Wikidata cross-language entity match (covers articles only present in
  //    e.g. Thai/Korean Wikipedia)
  const wd = await wikidataLookup(norm);
  if (wd && (await probeImage(wd))) return { id: row.id, url: wd, source: "wikidata" };

  // 2. Try each Wikipedia language for this destination country.
  for (const lang of langs) {
    const titles = await searchInLang(norm, lang);
    for (const title of titles) {
      if (!namesMatch(row.name, title)) continue;
      const img = await summary(title, lang);
      if (!img) continue;
      if (await probeImage(img)) return { id: row.id, url: img, source: lang };
    }
  }

  return { id: row.id, url: null };
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
  onProgress?: (done: number, total: number, result: R) => void,
): Promise<void> {
  let cursor = 0;
  const total = items.length;
  async function lane() {
    while (cursor < total) {
      const i = cursor++;
      const r = await worker(items[i]);
      onProgress?.(cursor, total, r);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const sql = postgres(process.env.DATABASE_URL);

  const rows = (await sql<Row[]>`
    SELECT h.id, h.slug, h.name, co.slug AS country_slug
    FROM hospitals h
    JOIN cities c ON c.id = h.city_id
    JOIN countries co ON co.id = c.country_id
    WHERE h.is_active = true
      AND h.cover_image_url LIKE '%images.unsplash.com%'
      AND h.name !~* '\\m(sub-district|health promotion|primary health|primary care|community health center|community health centre)\\M'
      AND length(h.name) >= 8
    ORDER BY h.is_featured DESC NULLS LAST, h.review_count DESC NULLS LAST, h.rating DESC NULLS LAST, h.id
    LIMIT ${LIMIT}
  `);

  console.log(`queued ${rows.length} hospitals · concurrency=${CONCURRENCY}`);

  let foundByLang: Record<string, number> = {};
  let updated = 0;
  let pending: Array<{ id: number; url: string }> = [];
  const FLUSH_EVERY = 60;

  async function flush() {
    if (DRY || pending.length === 0) return;
    const batch = pending;
    pending = [];
    try {
      await sql.unsafe(
        `UPDATE hospitals h SET cover_image_url = x.url, updated_at = now()
         FROM unnest($1::int[], $2::text[]) AS x(id, url)
         WHERE h.id = x.id AND h.cover_image_url LIKE '%images.unsplash.com%'`,
        [batch.map((u) => u.id), batch.map((u) => u.url)],
      );
      updated += batch.length;
    } catch (e) {
      pending = [...batch, ...pending];
      console.warn(`flush failed: ${(e as Error).message}`);
    }
  }

  const flushInterval = setInterval(() => void flush(), 30_000);

  try {
    await runPool(rows, CONCURRENCY, processOne, (done, total, r) => {
      if (r.url) {
        foundByLang[r.source ?? "?"] = (foundByLang[r.source ?? "?"] ?? 0) + 1;
        pending.push({ id: r.id, url: r.url });
      }
      if (done % 200 === 0 || done === total) {
        const total_found = Object.values(foundByLang).reduce((a, b) => a + b, 0);
        const breakdown = Object.entries(foundByLang)
          .map(([s, n]) => `${s}=${n}`)
          .join(" ");
        console.log(`[${done}/${total}] · found ${total_found} (${breakdown}) · ${updated} flushed`);
      }
      if (pending.length >= FLUSH_EVERY) void flush();
    });
    await flush();
  } finally {
    clearInterval(flushInterval);
  }

  const total_found = Object.values(foundByLang).reduce((a, b) => a + b, 0);
  console.log(`\ndone. ${DRY ? "would update" : "updated"} ${total_found} hospital photos.`);
  console.log("breakdown:", foundByLang);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
