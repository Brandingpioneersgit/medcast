/**
 * Wikipedia name-search image scraper.
 *
 * Automates the manual research pattern:
 *   1. Search Wikipedia (action=opensearch) by hospital name → candidate titles
 *   2. For each candidate, GET REST summary → check `originalimage` / `thumbnail`
 *   3. Filter out logos / maps / location markers
 *   4. HEAD-probe for ≥ 25KB content-length, write to DB
 *
 * Skips:
 *   - Hospitals already on real photos (Wikimedia, scraped, manual)
 *   - Hospitals whose name suggests primary-care / district / sub-district facilities
 *     that obviously won't have Wikipedia articles
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/wikipedia-image-search.ts
 *   ... --limit=2000
 *   ... --concurrency=8
 *   ... --dry-run
 */
import postgres from "postgres";

const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? 8000);
const CONCURRENCY = Number(process.argv.find((a) => a.startsWith("--concurrency="))?.slice(14) ?? 8);
const DRY = process.argv.includes("--dry-run");
const REQUEST_TIMEOUT_MS = 8000;

const UA = "MedCastsBot/1.0 (https://medcasts.com; bot@medcasts.com)";

type Row = { id: number; slug: string; name: string };

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

// Filter out URLs that look like logos / maps / location markers
function isLikelyBuilding(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("logo")) return false;
  if (u.includes("flag")) return false;
  if (u.includes("seal")) return false;
  if (u.includes("map_of")) return false;
  if (u.includes("locator")) return false;
  if (u.endsWith(".svg")) return false;
  if (/[\/_-](red|blue|green|yellow|black|white|orange)[\/_-]?(pog|dot|marker|pin)/i.test(u)) return false;
  return true;
}

// Strip common name suffixes that confuse Wikipedia search
function normalizeName(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .replace(/\bLtd\.?\b|\bLimited\b|\bLLC\b|\bPvt\.?\b|\bPrivate\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function searchWikipedia(name: string): Promise<string[]> {
  const norm = normalizeName(name);
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=3&search=${encodeURIComponent(norm)}`;
  type OpenSearch = [string, string[], string[], string[]];
  const data = await fetchJson<OpenSearch>(url);
  if (!data || !Array.isArray(data) || !Array.isArray(data[1])) return [];
  return data[1] as string[];
}

async function getPageSummary(title: string): Promise<{ image: string; size: number } | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  type Summary = {
    type?: string;
    title?: string;
    description?: string;
    originalimage?: { source: string; width?: number; height?: number };
    thumbnail?: { source: string; width?: number; height?: number };
  };
  const j = await fetchJson<Summary>(url);
  if (!j) return null;
  // Disambiguation pages don't represent the entity
  if (j.type === "disambiguation") return null;
  const orig = j.originalimage?.source;
  const thumb = j.thumbnail?.source;
  const candidate = orig ?? thumb;
  if (!candidate) return null;
  if (!isLikelyBuilding(candidate)) return null;
  // Prefer a reasonable size; the Wikipedia thumbnailer accepts /widthpx- prefixes
  // for most images so we'll request 1200px.
  let final = candidate;
  if (orig) {
    // Convert to /1280px-: orig URL pattern is /commons/X/YY/Filename.ext
    // Wikipedia thumbnailer accepts /commons/thumb/X/YY/Filename.ext/1280px-Filename.ext
    final = orig;
  }
  return { image: final, size: 0 };
}

// Fuzzy compare hospital DB name against Wikipedia article title to avoid
// claiming the photo of a totally unrelated entity.
function namesMatch(dbName: string, wikiTitle: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
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
  // Require ≥ 60% of the smaller token set to overlap
  const min = Math.min(aTokens.size, bTokens.size);
  return common / min >= 0.6;
}

async function processOne(row: Row): Promise<{ id: number; url: string | null }> {
  const candidates = await searchWikipedia(row.name);
  for (const title of candidates) {
    if (!namesMatch(row.name, title)) continue;
    const summary = await getPageSummary(title);
    if (!summary) continue;
    if (await probeImage(summary.image)) {
      return { id: row.id, url: summary.image };
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

  // Skip facilities whose name pattern suggests they won't have Wikipedia articles —
  // sub-district health centers, primary health centres, etc. Saves wasted API calls.
  const rows = (await sql<Row[]>`
    SELECT h.id, h.slug, h.name
    FROM hospitals h
    WHERE h.is_active = true
      AND h.cover_image_url LIKE '%images.unsplash.com%'
      AND h.name !~* '\\m(sub-district|health promotion|primary health|primary care|nursing home|community health center|community health centre)\\M'
      AND length(h.name) >= 8
    ORDER BY h.is_featured DESC NULLS LAST, h.review_count DESC NULLS LAST, h.rating DESC NULLS LAST, h.id
    LIMIT ${LIMIT}
  `);

  console.log(`queued ${rows.length} hospitals for Wikipedia search · concurrency=${CONCURRENCY}`);

  let found = 0;
  let updated = 0;
  let pending: Array<{ id: number; url: string }> = [];
  const FLUSH_EVERY = 100;

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
        found++;
        pending.push({ id: r.id, url: r.url });
      }
      if (done % 100 === 0 || done === total) {
        console.log(`[${done}/${total}] · ${found} matched · ${updated} flushed`);
      }
      if (pending.length >= FLUSH_EVERY) void flush();
    });
    await flush();
  } finally {
    clearInterval(flushInterval);
  }

  console.log(`\ndone. ${DRY ? "would update" : "updated"} ${updated} hospital photos via Wikipedia search.`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
