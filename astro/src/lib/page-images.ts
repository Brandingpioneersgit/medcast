/**
 * Page-image overrides — reads admin-managed entries from the page_images
 * table and short-circuits the default image fallback chain.
 *
 * Cache: a single in-memory map refreshed every 60s. We pay one round-trip
 * per minute per isolate, then every read is O(1). Render code calls
 * `pageImageFor(type, key, slot?)` and gets back a URL or null.
 */

import { sql } from "./db";

type Override = {
  url: string;
  altText: string | null;
  updatedAt: Date;
};

type CacheKey = string; // `${pageType}|${pageKey}|${slot}`

let cache: Map<CacheKey, Override> = new Map();
let cacheLoadedAt = 0;
let inflight: Promise<void> | null = null;

const TTL_MS = 60_000;

function key(pageType: string, pageKey: string, slot: string): CacheKey {
  return `${pageType}|${pageKey}|${slot}`;
}

async function refresh(): Promise<void> {
  try {
    const rows = await sql<
      { page_type: string; page_key: string; slot: string; url: string; alt_text: string | null; updated_at: Date }[]
    >`SELECT page_type, page_key, slot, url, alt_text, updated_at FROM page_images`;
    const next = new Map<CacheKey, Override>();
    for (const r of rows) {
      next.set(key(r.page_type, r.page_key, r.slot), {
        url: r.url,
        altText: r.alt_text,
        updatedAt: r.updated_at,
      });
    }
    cache = next;
    cacheLoadedAt = Date.now();
  } catch {
    // On error, keep the stale cache rather than blanking it.
    cacheLoadedAt = Date.now();
  } finally {
    inflight = null;
  }
}

async function ensureFresh(): Promise<void> {
  if (Date.now() - cacheLoadedAt < TTL_MS) return;
  if (!inflight) inflight = refresh();
  await inflight;
}

/**
 * Look up an admin-set image for (pageType, pageKey, slot).
 * Returns null when no override exists. Awaits the cache refresh on first
 * call per isolate (one DB round-trip), serves from memory thereafter.
 */
export async function pageImageFor(
  pageType: string,
  pageKey: string | null | undefined,
  slot: string = "cover",
): Promise<{ url: string; altText: string | null } | null> {
  if (!pageKey) return null;
  await ensureFresh();
  const hit = cache.get(key(pageType, pageKey, slot));
  return hit ? { url: hit.url, altText: hit.altText } : null;
}

/** Warm the in-memory cache so subsequent `pageImageForSync` calls work.
 * Call once at the top of a page's frontmatter when you'll do many sync
 * lookups (e.g. one per card in a grid). Cheap — single round-trip per
 * minute per isolate. */
export async function prefetchPageImages(): Promise<void> {
  await ensureFresh();
}

/** Sync read — useful when you've already awaited a prior `pageImageFor` on
 * this request and just want the URL. Returns null if not cached yet. */
export function pageImageForSync(
  pageType: string,
  pageKey: string | null | undefined,
  slot: string = "cover",
): { url: string; altText: string | null } | null {
  if (!pageKey) return null;
  const hit = cache.get(key(pageType, pageKey, slot));
  return hit ? { url: hit.url, altText: hit.altText } : null;
}
