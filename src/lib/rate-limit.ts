type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();
const MAX_ENTRIES = 5000;

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export function rateLimit({ key, limit, windowMs }: RateLimitOptions) {
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

function gc(now: number) {
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}

export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "anon";
}

export function tooMany(reset: number) {
  return new Response(
    JSON.stringify({ error: "rate_limited", retryAfterSeconds: Math.ceil((reset - Date.now()) / 1000) }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.ceil((reset - Date.now()) / 1000)),
      },
    }
  );
}
