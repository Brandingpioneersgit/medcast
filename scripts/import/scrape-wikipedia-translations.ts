/**
 * Scrape Wikipedia interlanguage links to fill hospital translations
 * for 7 non-English locales. No API keys — Wikipedia's REST summary
 * endpoint is anonymous and public.
 *
 * Strategy:
 *  1. For each hospital with a Wikipedia URL or matchable name, fetch
 *     the English summary to get the page id.
 *  2. Fetch langlinks to discover which languages have versions.
 *  3. For each of our target locales (ar, ru, fr, pt, bn, tr, hi),
 *     fetch that language's summary and write the translated name +
 *     first-paragraph description to the `translations` table.
 *
 * Idempotent via ON CONFLICT. Skips hospitals already translated.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/import/scrape-wikipedia-translations.ts
 * Flags: --limit=100 | --dry-run
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? 200);

const TARGET_LOCALES = ["ar", "ru", "fr", "pt", "bn", "tr", "hi"] as const;
type Locale = (typeof TARGET_LOCALES)[number];

const UA = "MedCastsBot/1.0 (https://medcasts.com/bot; contact@medcasts.com)";
const REQUEST_TIMEOUT_MS = 8000;
const CONCURRENCY = 5;

async function fetchJson<T = any>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
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
    clearTimeout(t);
  }
}

/** Guess the English Wikipedia title from a hospital URL or name. */
function enTitleFromName(name: string): string {
  return encodeURIComponent(name.trim().replace(/\s+/g, "_"));
}

type Row = { id: number; name: string };

async function translateOne(
  row: Row,
): Promise<Array<{ locale: Locale; field: string; value: string }>> {
  const enTitle = enTitleFromName(row.name);

  // Step 1: langlinks from the English page. Use the raw action API
  // (still anonymous, no key) for better language coverage.
  type LangLink = { lang: string; title: string };
  type ApiResp = {
    query?: {
      pages?: Record<string, { langlinks?: LangLink[]; missing?: string }>;
    };
  };
  const api = await fetchJson<ApiResp>(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${enTitle}&prop=langlinks&lllimit=50&format=json&origin=*`,
  );
  if (!api?.query?.pages) return [];

  const page = Object.values(api.query.pages)[0];
  if (!page || page.missing !== undefined) return [];
  const langLinks = page.langlinks ?? [];
  if (langLinks.length === 0) return [];

  const byLang = new Map<string, string>(langLinks.map((l) => [l.lang, l.title]));

  const results: Array<{ locale: Locale; field: string; value: string }> = [];

  for (const loc of TARGET_LOCALES) {
    const title = byLang.get(loc);
    if (!title) continue;

    // Step 2: fetch that language's summary endpoint (REST).
    type Summary = { title: string; extract?: string; description?: string };
    const summary = await fetchJson<Summary>(
      `https://${loc}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title.replace(/\s+/g, "_"),
      )}`,
    );
    if (!summary || !summary.title) continue;

    results.push({ locale: loc, field: "name", value: summary.title });
    if (summary.extract && summary.extract.length > 40) {
      // First paragraph only, capped at 600 chars
      const firstPara = summary.extract.split(/\n/)[0];
      results.push({
        locale: loc,
        field: "description",
        value: firstPara.length > 600 ? firstPara.slice(0, 597) + "..." : firstPara,
      });
    }
  }

  return results;
}

async function runPool<T, R>(items: T[], concurrency: number, worker: (x: T) => Promise<R>, onProgress?: (done: number, total: number, r: R) => void): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const total = items.length;
  async function lane() {
    while (cursor < total) {
      const i = cursor++;
      results[i] = await worker(items[i]);
      onProgress?.(cursor, total, results[i]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
  return results;
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  // Target hospitals we haven't tried yet.
  // Phase 7 already translated the top 180; everything else either has no
  // Wikipedia page or has a very specific name. Scan the next tier anyway —
  // ~5-15% of named hospitals globally have Wikipedia entries in at least
  // one non-English language.
  const rows = (await sql`
    SELECT h.id, h.name
    FROM hospitals h
    JOIN cities c ON c.id = h.city_id
    JOIN countries co ON co.id = c.country_id AND co.is_destination = true
    WHERE h.is_active = true
      AND length(h.name) > 12      -- skip very short/generic names
      AND h.name ~ '^[A-Z]'        -- proper-noun-cased
      AND NOT h.name ~* '(medical center|district hospital|general hospital|civil hospital)$'
      AND NOT EXISTS (
        SELECT 1 FROM translations t
        WHERE t.translatable_type = 'hospital'
          AND t.translatable_id = h.id
          AND t.field_name = 'description'
          AND t.locale = 'fr'
      )
    ORDER BY h.is_featured DESC NULLS LAST, h.bed_capacity DESC NULLS LAST, h.id
    LIMIT ${LIMIT}
  `) as unknown as Row[];

  console.log(`queued ${rows.length} hospitals${DRY ? " (DRY RUN)" : ""}`);

  let hits = 0;
  let totalFields = 0;
  const allUpdates: Array<{ id: number; locale: string; field: string; value: string }> = [];

  await runPool(rows, CONCURRENCY, translateOne, (done, total, r) => {
    if (r.length > 0) {
      hits++;
      totalFields += r.length;
      const row = rows[done - 1];
      for (const x of r) {
        allUpdates.push({ id: row.id, locale: x.locale, field: x.field, value: x.value });
      }
    }
    if (done % 25 === 0 || done === total) {
      console.log(`[${done}/${total}] hospitals checked · ${hits} matched · ${totalFields} translation rows queued`);
    }
  });

  if (!DRY && allUpdates.length > 0) {
    for (let i = 0; i < allUpdates.length; i += 200) {
      const batch = allUpdates.slice(i, i + 200);
      const ids = batch.map((u) => u.id);
      const locs = batch.map((u) => u.locale);
      const fields = batch.map((u) => u.field);
      const values = batch.map((u) => u.value);
      await sql.unsafe(
        `INSERT INTO translations (translatable_type, translatable_id, locale, field_name, value, updated_at)
         SELECT 'hospital', x.id, x.locale, x.field, x.value, now()
         FROM unnest($1::int[], $2::text[], $3::text[], $4::text[]) AS x(id, locale, field, value)
         ON CONFLICT (translatable_type, translatable_id, locale, field_name)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [ids, locs, fields, values],
      );
    }
  }

  console.log(
    DRY
      ? `would write ${allUpdates.length} translation rows across ${hits} hospitals`
      : `wrote ${allUpdates.length} translation rows across ${hits} hospitals`,
  );
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
