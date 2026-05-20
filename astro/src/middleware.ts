import { defineMiddleware } from "astro:middleware";
import { sql } from "@/lib/db";

/**
 * Redirect middleware. Checks a small cached map on every request and issues
 * 301/302 when an exact-path match is found. Cache TTL is short (60s) so an
 * admin edit propagates quickly without hammering the DB on every page load.
 *
 * Match key is the path with locale segment stripped and any trailing slash
 * removed, so `/en/hospital/old-name` and `/hospital/old-name` both match a
 * redirect stored as `/hospital/old-name`.
 *
 * Reuses the shared `sql` client from `@/lib/db` — opening a fresh
 * `postgres()` per cache miss was wasting a TCP/TLS handshake on every
 * request that fell off the 60-second cache.
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
  try {
    const rows = (await sql<RedirectRow[]>`
      SELECT from_path, to_path, status_code FROM redirects
    `) as unknown as RedirectRow[];
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

/**
 * Adds `Vary: Cookie` to an HTML response **only when the request actually
 * carries a currency cookie** (the only cookie that affects server-rendered
 * HTML). For first-time visitors, crawlers, and 95%+ of CDN traffic, no
 * cookie means no `Vary` — so the response is fully cacheable on a single
 * key per URL. The consent cookie is read client-side only and doesn't
 * change the rendered HTML, so it doesn't warrant a `Vary`.
 *
 * This is a meaningful CDN hit-rate win versus the previous always-on
 * `Vary: Cookie`, which fragmented the cache across every analytics + GA +
 * Crisp + session cookie a returning visitor might carry.
 */
const RELEVANT_COOKIES = ["mc-currency"];
function hasRelevantCookie(req: Request): boolean {
  const raw = req.headers.get("cookie");
  if (!raw) return false;
  return RELEVANT_COOKIES.some((name) => new RegExp(`(?:^|;\\s*)${name}=`).test(raw));
}

function applyVary(res: Response, req: Request): Response {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) return res;
  if (!hasRelevantCookie(req)) return res;
  const existing = res.headers.get("vary");
  if (existing) {
    const tokens = existing.split(",").map((t) => t.trim().toLowerCase());
    if (tokens.includes("cookie") || tokens.includes("*")) return res;
    res.headers.set("vary", `${existing}, Cookie`);
  } else {
    res.headers.set("vary", "Cookie");
  }
  return res;
}

/**
 * Apply baseline security headers to every response. Cheap, defensive, and
 * uniformly applied via middleware so individual page templates don't need
 * to care.
 */
function applySecurityHeaders(res: Response): Response {
  const h = res.headers;
  // Don't sniff; honour declared content-type.
  if (!h.has("x-content-type-options")) h.set("x-content-type-options", "nosniff");
  // Reasonable default referrer policy.
  if (!h.has("referrer-policy")) h.set("referrer-policy", "strict-origin-when-cross-origin");
  // Long HSTS with subdomains. Add `; preload` once registered with hstspreload.org.
  if (!h.has("strict-transport-security")) {
    // 1 year + subdomains. Add `; preload` *only* once you've registered at
    // hstspreload.org — once the domain is in the preload list, removing it
    // takes 12+ months. For now we ship max-age=2y so the registration
    // requirement (≥1y) is comfortably met whenever the user submits.
    h.set("strict-transport-security", "max-age=63072000; includeSubDomains");
  }
  // Restrict powerful APIs by default. Forms ask for none of these.
  if (!h.has("permissions-policy")) {
    h.set(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    );
  }
  // Don't let the page be framed by a third-party origin (clickjacking).
  if (!h.has("x-frame-options")) h.set("x-frame-options", "SAMEORIGIN");
  // Cross-origin opener policy — isolates the browsing context so a popup
  // can't reach back into our window via window.opener. Cheap.
  if (!h.has("cross-origin-opener-policy")) h.set("cross-origin-opener-policy", "same-origin");
  // Resource policy: same-site lets our own subdomains embed assets; tighter
  // than the default `cross-origin` while still allowing R2/CDN fetches.
  if (!h.has("cross-origin-resource-policy")) h.set("cross-origin-resource-policy", "same-site");
  // Skip COEP — would break our Unsplash + Cloudinary cross-origin images
  // unless those CDNs ship CORP headers (they don't).
  // Modern Reporting API endpoint declaration — supersedes the legacy
  // `report-uri` directive on browsers that support it.
  if (!h.has("reporting-endpoints")) {
    h.set("reporting-endpoints", `csp-endpoint="/api/csp-report"`);
  }
  // Adobe Flash + PDF cross-domain policy — historical, but still ships
  // by default in some servers. Lock down explicitly.
  if (!h.has("x-permitted-cross-domain-policies")) {
    h.set("x-permitted-cross-domain-policies", "none");
  }
  // Content Security Policy — Report-Only first so we collect violation
  // reports for ~1-2 weeks before flipping to enforcement. `unsafe-inline`
  // on script-src is required by JSON-LD blocks + the GTM/GA snippet (both
  // emitted via `is:inline`). Switch to nonces or hashes when promoting.
  //
  // Readiness audit (2026-05-05):
  //   - 140 inline scripts (mostly JSON-LD blocks)
  //   - 24 inline <style> blocks
  //   - 0 inline event handlers (onclick=, etc.) ✓
  // Flipping to enforce as-is would still ship `unsafe-inline` so the
  // security gain is marginal. The real win comes from replacing
  // `unsafe-inline` with `'strict-dynamic' 'nonce-<random>'` — that
  // requires a request-time nonce injector at the Worker layer.
  const ct = h.get("content-type") ?? "";
  if (ct.includes("text/html") && !h.has("content-security-policy-report-only")) {
    h.set(
      "content-security-policy-report-only",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://*.googletagmanager.com https://*.google-analytics.com",
        "font-src 'self' data:",
        "connect-src 'self' https://*.google-analytics.com https://*.googletagmanager.com https://*.sentry.io",
        "frame-src 'self' https://www.googletagmanager.com",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
        // Legacy form (still supported everywhere) + modern Reporting API
        // form (matches the Reporting-Endpoints group above).
        "report-uri /api/csp-report",
        "report-to csp-endpoint",
      ].join("; "),
    );
  }
  return res;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const t0 = Date.now();
  // Skip redirect logic for API routes + assets, but still flag API responses
  // as noindex so search crawlers don't index JSON payloads.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_")) {
    const r = await next();
    if (url.pathname.startsWith("/api/") && !r.headers.has("x-robots-tag")) {
      r.headers.set("x-robots-tag", "noindex, nofollow");
    }
    r.headers.set("server-timing", `total;dur=${Date.now() - t0}`);
    return r;
  }

  const key = stripLocaleAndTrail(url.pathname);
  const rows = await loadRedirects();
  const hit = rows.get(key);
  if (hit) {
    // Best-effort hit counter (fire-and-forget; don't block the response).
    void sql`
      UPDATE redirects
         SET hit_count = hit_count + 1,
             last_hit_at = NOW()
       WHERE from_path = ${key}
    `.catch(() => {});
    // Preserve query string when redirecting.
    const target = hit.to_path + url.search;
    const status = hit.status_code === 302 ? 302 : 301;
    const redirectRes = new Response(null, {
      status,
      headers: {
        Location: target,
        // 301s are permanent — let the CDN cache them aggressively. 302s shouldn't be cached.
        "Cache-Control": status === 301
          ? "public, max-age=86400, s-maxage=604800"
          : "no-store",
      },
    });
    return applySecurityHeaders(redirectRes);
  }

  const response = await next();
  // Server-Timing — visible in browser DevTools Network tab and consumable
  // by RUM tools. `total` is the wall-clock time from middleware entry to
  // response handoff. Adding it never breaks a response.
  response.headers.set("server-timing", `total;dur=${Date.now() - t0}`);
  return applySecurityHeaders(applyVary(response, context.request));
});
