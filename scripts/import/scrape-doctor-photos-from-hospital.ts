/**
 * Scrape doctor portraits from their hospital website.
 *
 * Strategy: for each active doctor whose current image_url is a Pravatar
 * fallback (i.e. not a real photo), fetch the doctor's hospital homepage
 * + a few common staff-listing paths (/doctors, /our-doctors, /our-team,
 * /team, /specialists, /consultants, /find-a-doctor). Search the HTML for
 * the doctor's name; when found, look for the nearest <img> within ~600
 * chars in either direction. Validate it's a portrait (square-ish
 * aspect ratio when known, content-length ≥ 15KB) and write to DB.
 *
 * Skips doctors with real Wikimedia photos. Idempotent — re-runs only touch
 * Pravatar URLs.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/scrape-doctor-photos-from-hospital.ts
 *   ... --limit=200
 *   ... --concurrency=8
 */
import postgres from "postgres";

const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? 1500);
const CONCURRENCY = Number(process.argv.find((a) => a.startsWith("--concurrency="))?.slice(14) ?? 8);
const REQUEST_TIMEOUT_MS = 8000;

// Real Chrome UA — bot UA gets 403'd by tier-1 Indian hospital sites.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type Row = {
  id: number;
  slug: string;
  name: string;
  hospital_website: string;
  hospital_id: number;
};

const STAFF_PATHS = [
  "",
  "/doctors",
  "/our-doctors",
  "/find-a-doctor",
  "/doctor",
  "/our-team",
  "/team",
  "/specialists",
  "/consultants",
  "/medical-team",
  "/our-experts",
  "/staff",
];

// Cache: hospital website → consolidated HTML from all staff paths
const HOSPITAL_HTML_CACHE = new Map<number, Promise<string>>();

async function fetchHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
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
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return "";
    const text = await res.text();
    return text.length > 1_500_000 ? text.slice(0, 1_500_000) : text;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function getHospitalCorpus(hospitalId: number, website: string): Promise<string> {
  if (HOSPITAL_HTML_CACHE.has(hospitalId)) return HOSPITAL_HTML_CACHE.get(hospitalId)!;
  const promise = (async () => {
    let baseUrl = website.trim();
    if (!/^https?:\/\//i.test(baseUrl)) baseUrl = "https://" + baseUrl;

    const parts: string[] = [];
    for (const path of STAFF_PATHS) {
      const target = path ? new URL(path, baseUrl).toString() : baseUrl;
      const html = await fetchHtml(target);
      if (html) parts.push(html);
      if (parts.join("").length > 800_000) break; // cap corpus
    }
    return parts.join("\n");
  })();
  HOSPITAL_HTML_CACHE.set(hospitalId, promise);
  return promise;
}

function normalizeName(name: string): string[] {
  // Strip honorifics, return list of name token variations (last+first, full, lastname).
  const cleaned = name.replace(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "").trim();
  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);
  return tokens;
}

function buildSearchVariants(name: string): RegExp[] {
  const tokens = normalizeName(name);
  if (tokens.length === 0) return [];

  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const fullRe = new RegExp(
    `\\b${tokens.map(escapeRe).join("\\s+")}\\b`,
    "i",
  );
  // Last-name-only is too noisy to match alone, but combined with adjacent first is OK.
  // Also try "Lastname, Firstname" Western style
  const last = tokens[tokens.length - 1];
  const first = tokens[0];
  if (tokens.length >= 2) {
    const flippedRe = new RegExp(
      `\\b${escapeRe(last)},?\\s+${escapeRe(first)}\\b`,
      "i",
    );
    return [fullRe, flippedRe];
  }
  return [fullRe];
}

function resolveUrl(raw: string, base: string): string | null {
  try {
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return "https:" + raw;
    if (raw.startsWith("data:")) return null;
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

const PORTRAIT_SKIP = [
  /logo/i,
  /icon/i,
  /favicon/i,
  /banner/i,
  /\.svg(\?|$)/i,
  /\.gif(\?|$)/i,
  /placeholder/i,
  /default/i,
  /facebook|twitter|instagram|youtube|linkedin|whatsapp/i,
  /(google[\/_-]?play|app[\/_-]?store)/i,
];

function isPortraitCandidate(url: string, alt: string, w?: number, h?: number): boolean {
  if (PORTRAIT_SKIP.some((re) => re.test(`${url} ${alt}`))) return false;
  // Reject extremely landscape (banners) when both dims known
  if (w && h && w > h * 2) return false;
  // Reject very small (< 80px squared)
  if (w && w < 80) return false;
  return true;
}

// Find the closest <img> tag within ±SCAN_RADIUS chars of the name match.
function findNearbyImage(html: string, matchIdx: number, baseUrl: string): { url: string } | null {
  const SCAN_RADIUS = 1200;
  const start = Math.max(0, matchIdx - SCAN_RADIUS);
  const end = Math.min(html.length, matchIdx + SCAN_RADIUS);
  const slice = html.slice(start, end);

  const candidates: Array<{ url: string; pos: number; alt: string; w?: number; h?: number }> = [];

  // 1. <img> tags
  const imgRe = /<img\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(slice)) !== null) {
    const attrs = m[1];
    const srcMatch = attrs.match(/\b(?:data-src|data-lazy-src|data-original|src)\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const abs = resolveUrl(srcMatch[1].trim(), baseUrl);
    if (!abs || !/^https?:\/\//i.test(abs)) continue;
    const altMatch = attrs.match(/\balt\s*=\s*["']([^"']*)["']/i);
    const widthMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+)["']?/i);
    const heightMatch = attrs.match(/\bheight\s*=\s*["']?(\d+)["']?/i);
    candidates.push({
      url: abs,
      pos: start + (m.index ?? 0),
      alt: altMatch ? altMatch[1] : "",
      w: widthMatch ? Number(widthMatch[1]) : undefined,
      h: heightMatch ? Number(heightMatch[1]) : undefined,
    });
  }

  // 2. background-image
  const bgRe = /background(?:-image)?\s*:\s*[^;}"']*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  while ((m = bgRe.exec(slice)) !== null) {
    const abs = resolveUrl(m[1].trim(), baseUrl);
    if (!abs || !/^https?:\/\//i.test(abs)) continue;
    candidates.push({ url: abs, pos: start + (m.index ?? 0), alt: "", w: undefined, h: undefined });
  }

  if (candidates.length === 0) return null;

  // Filter to portrait candidates
  const portraits = candidates.filter((c) => isPortraitCandidate(c.url, c.alt, c.w, c.h));
  if (portraits.length === 0) return null;

  // Pick the one closest to the name match
  portraits.sort((a, b) => Math.abs(a.pos - matchIdx) - Math.abs(b.pos - matchIdx));
  return { url: portraits[0].url };
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
    if (len > 0 && len < 12_000) return false;
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function processOne(row: Row): Promise<{ id: number; url: string | null }> {
  const html = await getHospitalCorpus(row.hospital_id, row.hospital_website);
  if (!html) return { id: row.id, url: null };

  const variants = buildSearchVariants(row.name);
  if (variants.length === 0) return { id: row.id, url: null };

  let baseUrl = row.hospital_website.trim();
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = "https://" + baseUrl;

  for (const re of variants) {
    const m = re.exec(html);
    if (!m || m.index === undefined) continue;
    const found = findNearbyImage(html, m.index, baseUrl);
    if (!found) continue;
    if (await probeImage(found.url)) return { id: row.id, url: found.url };
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
  const sql = postgres(process.env.DATABASE_URL!);

  const rows = (await sql.unsafe(
    `SELECT d.id, d.slug, d.name, h.id AS hospital_id, h.website AS hospital_website
     FROM doctors d
     INNER JOIN hospitals h ON h.id = d.hospital_id
     WHERE d.is_active = true
       AND h.website IS NOT NULL AND h.website != ''
       AND (d.image_url IS NULL OR d.image_url LIKE '%pravatar%')
     ORDER BY d.is_featured DESC NULLS LAST, d.patients_treated DESC NULLS LAST, d.id
     LIMIT ${LIMIT}`,
  )) as unknown as Row[];

  // Group by hospital so corpus cache is hit
  rows.sort((a, b) => a.hospital_id - b.hospital_id);

  console.log(`queued ${rows.length} doctors across hospital websites · concurrency=${CONCURRENCY}`);

  let found = 0;
  let updated = 0;
  let pending: Array<{ id: number; url: string }> = [];
  const FLUSH_EVERY = 50;

  async function flush() {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    try {
      await sql.unsafe(
        `UPDATE doctors d SET image_url = x.url, updated_at = now()
         FROM unnest($1::int[], $2::text[]) AS x(id, url)
         WHERE d.id = x.id`,
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
      if (done % 25 === 0 || done === total) {
        console.log(`[${done}/${total}] · ${found} real doctor photos found · ${updated} flushed`);
      }
      if (pending.length >= FLUSH_EVERY) void flush();
    });
    await flush();
  } finally {
    clearInterval(flushInterval);
  }

  console.log(`\ndone. ${updated} real doctor portraits written.`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
