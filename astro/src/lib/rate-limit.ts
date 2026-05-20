type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();
const MAX_ENTRIES = 5000;

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = { ok: boolean; remaining: number; reset: number };

/**
 * In-memory rate limiter — process-local, fine for single-Worker dev and
 * unit tests. For multi-isolate Cloudflare prod, use `rateLimitKv()` with
 * the platform-bound `MC_RATELIMIT` namespace (see wrangler.toml).
 */
export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    const fresh: Bucket = { count: 1, reset: now + windowMs };
    buckets.set(key, fresh);
    if (buckets.size > MAX_ENTRIES) gc(now);
    return { ok: true, remaining: limit - 1, reset: fresh.reset };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, reset: b.reset };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, reset: b.reset };
}

/**
 * KV-backed rate limiter. Survives Worker isolate eviction and works
 * across multiple Cloudflare regions, unlike the in-memory variant.
 *
 * KV's eventual consistency makes this *imprecise* — under burst traffic
 * across multiple POPs, a few extra requests may slip through. That's
 * acceptable for our threat model (form-submission spam, not auth
 * bruteforce). For strict limits use a Durable Object instead.
 *
 * Stored value: `<count>:<resetMs>`. We CAS via `expiration` to garbage-
 * collect automatically once the window closes.
 */
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expiration?: number; expirationTtl?: number }): Promise<void>;
}

export async function rateLimitKv(
  kv: KvLike,
  { key, limit, windowMs }: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  const raw = await kv.get(key).catch(() => null);
  if (!raw) {
    const reset = now + windowMs;
    await kv
      .put(key, `1:${reset}`, { expirationTtl: Math.ceil(windowMs / 1000) })
      .catch(() => {});
    return { ok: true, remaining: limit - 1, reset };
  }
  const [countStr, resetStr] = raw.split(":");
  const count = parseInt(countStr ?? "0", 10);
  const reset = parseInt(resetStr ?? "0", 10);
  if (!Number.isFinite(reset) || reset < now) {
    const newReset = now + windowMs;
    await kv
      .put(key, `1:${newReset}`, { expirationTtl: Math.ceil(windowMs / 1000) })
      .catch(() => {});
    return { ok: true, remaining: limit - 1, reset: newReset };
  }
  if (count >= limit) return { ok: false, remaining: 0, reset };
  await kv
    .put(key, `${count + 1}:${reset}`, { expirationTtl: Math.ceil((reset - now) / 1000) || 1 })
    .catch(() => {});
  return { ok: true, remaining: limit - count - 1, reset };
}

function gc(now: number) {
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  if (buckets.size > MAX_ENTRIES) {
    const entries = [...buckets.entries()].sort((a, b) => a[1].reset - b[1].reset);
    const excess = buckets.size - MAX_ENTRIES;
    for (let i = 0; i < excess; i++) buckets.delete(entries[i]![0]);
  }
}

export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "anon";
}

/**
 * Spam honeypot — caller hides a field named `_hp` (or whatever) in the
 * form, off-screen + with autocomplete=off. Real users don't fill it;
 * naive bots do. Returns true when the field is non-empty (= bot).
 *
 * Pair with `requireSameOrigin` + `rateLimit` for layered defense without
 * a CAPTCHA on every form.
 */
export function isHoneypotTripped(body: Record<string, unknown> | null | undefined): boolean {
  if (!body) return false;
  for (const k of ["_hp", "honeypot", "website", "url_field"]) {
    const v = (body as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

/**
 * CSRF guard for JSON POST endpoints. Verifies the request's `Origin` (or
 * `Referer` fallback) matches the request host. JSON content-type requests
 * already require a CORS preflight, so this is belt-and-braces — but a
 * malicious site doing `<form>`-style POSTs or a CORS misconfig would
 * otherwise be able to spam our inquiry table.
 *
 * Returns null when the request is allowed; a Response when it should be
 * rejected.
 */
export function requireSameOrigin(req: Request): Response | null {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  // No Origin and no Referer → likely server-to-server (cron, curl). Allow,
  // but the rate limiter still applies.
  if (!origin && !referer) return null;
  const expected = `${url.protocol}//${url.host}`;
  if (origin && origin === expected) return null;
  if (!origin && referer && referer.startsWith(expected)) return null;
  return new Response(JSON.stringify({ error: "Cross-origin request rejected" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}
