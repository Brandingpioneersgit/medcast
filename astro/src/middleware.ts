import { defineMiddleware } from "astro:middleware";
import postgres from "postgres";

/**
 * Redirect middleware. Checks a small cached map on every request and issues
 * 301/302 when an exact-path match is found. Cache TTL is short (60s) so an
 * admin edit propagates quickly without hammering the DB on every page load.
 *
 * Match key is the path with locale segment stripped and any trailing slash
 * removed, so `/en/hospital/old-name` and `/hospital/old-name` both match a
 * redirect stored as `/hospital/old-name`.
 */

type RedirectRow = { from_path: string; to_path: string; status_code: number };

let cache: { loadedAt: number; rows: Map<string, RedirectRow> } | null = null;
const TTL_MS = 60_000;
const LOCALE_PREFIXES = new Set(["en", "ar", "ru", "fr", "pt", "bn", "tr", "hi"]);

function stripLocaleAndTrail(path: string): string {
  let p = path;
  // Drop leading locale segment if present.
  const m = /^\/([a-z]{2})(\/|$)/i.exec(p);
  if (m && LOCALE_PREFIXES.has(m[1].toLowerCase())) {
    p = p.slice(m[1].length + 1); // drop "/en" → leaves "/..." or ""
    if (p === "") p = "/";
  }
  // Drop trailing slash (except on root).
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

async function loadRedirects(): Promise<Map<string, RedirectRow>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) return cache.rows;
  const dbUrl = (import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL) as string | undefined;
  if (!dbUrl) {
    cache = { loadedAt: now, rows: new Map() };
    return cache.rows;
  }
  try {
    const sql = postgres(dbUrl, { max: 1, idle_timeout: 2, connect_timeout: 3 });
    const rows = (await sql<RedirectRow[]>`
      SELECT from_path, to_path, status_code FROM redirects
    `) as unknown as RedirectRow[];
    await sql.end({ timeout: 1 });
    const map = new Map<string, RedirectRow>();
    for (const r of rows) map.set(r.from_path, r);
    cache = { loadedAt: now, rows: map };
    return map;
  } catch {
    // On error, serve stale cache if we have one — never break the request.
    if (cache) return cache.rows;
    cache = { loadedAt: now, rows: new Map() };
    return cache.rows;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  // Skip API routes + assets — redirects are for content pages only.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_")) {
    return next();
  }

  const key = stripLocaleAndTrail(url.pathname);
  const rows = await loadRedirects();
  const hit = rows.get(key);
  if (hit) {
    // Best-effort hit counter (fire-and-forget; don't block the response).
    const dbUrl = (import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL) as string | undefined;
    if (dbUrl) {
      try {
        const sql = postgres(dbUrl, { max: 1, idle_timeout: 2, connect_timeout: 3 });
        void sql`
          UPDATE redirects
             SET hit_count = hit_count + 1,
                 last_hit_at = NOW()
           WHERE from_path = ${key}
        `.then(() => sql.end({ timeout: 1 })).catch(() => {});
      } catch {
        // ignore
      }
    }
    // Preserve query string when redirecting.
    const target = hit.to_path + url.search;
    return new Response(null, {
      status: hit.status_code === 302 ? 302 : 301,
      headers: { Location: target },
    });
  }
  return next();
});
