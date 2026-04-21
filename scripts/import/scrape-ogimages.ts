/**
 * Scrape og:image from hospital websites to fill cover_image_url.
 * No API keys — just public HTTP GET + meta-tag regex.
 *
 * Skips hospitals that already have a cover_image_url set.
 * Runs 8 concurrent fetches, 10s timeout each, logs progress.
 * Idempotent: re-run only processes remaining hospitals.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/import/scrape-ogimages.ts
 * Flags: --limit=500 | --country=india | --dry-run
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? 1000);
const ONLY_COUNTRY = process.argv.find((a) => a.startsWith("--country="))?.slice(10);
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 10000;

type Row = { id: number; slug: string; website: string };

const UA = "Mozilla/5.0 (compatible; MedCastsBot/1.0; +https://medcasts.com/bot)";

// Prefer these in order: og:image > twitter:image > image_src > apple-touch-icon (fallback)
const META_PATTERNS: Array<{ re: RegExp; group: number }> = [
  { re: /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i, group: 1 },
  { re: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i, group: 1 },
  { re: /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i, group: 1 },
  { re: /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i, group: 1 },
  { re: /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i, group: 1 },
];

function pickImage(html: string): string | null {
  for (const { re, group } of META_PATTERNS) {
    const m = html.match(re);
    if (m && m[group]) return m[group];
  }
  return null;
}

function resolve(raw: string, base: string): string | null {
  try {
    // Already absolute with scheme
    if (/^https?:\/\//i.test(raw)) return raw;
    // Protocol-relative
    if (raw.startsWith("//")) return "https:" + raw;
    // Leading slash → root-relative
    if (raw.startsWith("/")) return new URL(raw, base).toString();
    // Otherwise resolve against base
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

function isReasonableImage(url: string): boolean {
  // Must be https (for mixed-content safety on medcasts.com)
  if (!/^https:\/\//i.test(url)) return false;
  // Strip query string + check extension
  const pathLower = url.split("?")[0].toLowerCase();
  if (pathLower.length > 500) return false;
  // Accept typical image extensions OR unknown (some CDNs use /image/123)
  if (/\.(jpe?g|png|webp|gif|avif|bmp)$/.test(pathLower)) return true;
  // URLs with "image" / "media" / "cdn" / "upload" in path are usually real images
  if (/\b(image|img|media|cdn|upload|photo|asset|static)\b/.test(pathLower)) return true;
  return false;
}

async function fetchWithTimeout(url: string, ms: number): Promise<string | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null;
    // Cap at 800KB — enough for <head>
    const text = await res.text();
    return text.length > 800_000 ? text.slice(0, 800_000) : text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function processOne(row: Row): Promise<{ id: number; url: string | null }> {
  // Clean the website URL
  let website = row.website.trim();
  if (!/^https?:\/\//i.test(website)) website = "https://" + website;

  const html = await fetchWithTimeout(website, REQUEST_TIMEOUT_MS);
  if (!html) return { id: row.id, url: null };

  const raw = pickImage(html);
  if (!raw) return { id: row.id, url: null };

  const abs = resolve(raw, website);
  if (!abs || !isReasonableImage(abs)) return { id: row.id, url: null };

  return { id: row.id, url: abs };
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
  onProgress?: (done: number, total: number, result: R) => void,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const total = items.length;
  async function lane() {
    while (cursor < total) {
      const i = cursor++;
      const r = await worker(items[i]);
      results[i] = r;
      onProgress?.(cursor, total, r);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
  return results;
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  const conditions: string[] = [
    "h.is_active = true",
    "h.cover_image_url IS NULL",
    "h.website IS NOT NULL",
    "h.website != ''",
  ];
  const whereSql = conditions.join(" AND ");
  const rows = ONLY_COUNTRY
    ? ((await sql.unsafe(
        `SELECT h.id, h.slug, h.website
         FROM hospitals h
         JOIN cities c ON c.id = h.city_id
         JOIN countries co ON co.id = c.country_id
         WHERE ${whereSql} AND co.slug = $1
         ORDER BY h.is_featured DESC NULLS LAST, h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST
         LIMIT ${LIMIT}`,
        [ONLY_COUNTRY],
      )) as unknown as Row[])
    : ((await sql.unsafe(
        `SELECT h.id, h.slug, h.website
         FROM hospitals h
         WHERE ${whereSql}
         ORDER BY h.is_featured DESC NULLS LAST, h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST
         LIMIT ${LIMIT}`,
      )) as unknown as Row[]);

  console.log(`queued ${rows.length} hospitals${DRY ? " (DRY RUN)" : ""}`);

  let found = 0;
  let updated = 0;
  const FLUSH_EVERY = 100;
  let pending: Array<{ id: number; url: string }> = [];

  async function flush() {
    if (DRY || pending.length === 0) return;
    const batch = pending;
    pending = [];
    const ids = batch.map((u) => u.id);
    const urls = batch.map((u) => u.url);
    try {
      await sql.unsafe(
        `UPDATE hospitals h
         SET cover_image_url = x.url, updated_at = now()
         FROM unnest($1::int[], $2::text[]) AS x(id, url)
         WHERE h.id = x.id AND h.cover_image_url IS NULL`,
        [ids, urls],
      );
      updated += batch.length;
    } catch (e) {
      // Re-queue the rows so we don't lose work — retried on next flush.
      pending = [...batch, ...pending];
      console.warn(`flush failed, will retry: ${(e as Error).message}`);
    }
  }

  // Periodic flush — keeps DB connection warm during slow HTTP-bound work
  // and bounds in-memory state so a mid-run crash costs at most FLUSH_EVERY rows.
  const flushInterval = setInterval(() => {
    void flush();
  }, 30_000);

  try {
    await runPool(rows, CONCURRENCY, processOne, (done, total, r) => {
      if (r.url) {
        found++;
        pending.push({ id: r.id, url: r.url });
      }
      if (done % 50 === 0 || done === total) {
        console.log(`[${done}/${total}] scraped · ${found} og:image found · ${updated} flushed`);
      }
      if (pending.length >= FLUSH_EVERY) void flush();
    });
    await flush();
    await flush(); // second pass in case the first had failures
  } finally {
    clearInterval(flushInterval);
  }

  console.log(
    DRY
      ? `would update ${found} cover_image_url rows`
      : `updated ${updated} cover_image_url rows`,
  );
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
