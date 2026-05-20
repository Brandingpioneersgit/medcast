/**
 * Lightweight health probe.
 *
 * Returns 200 + JSON when the request can reach the DB; 503 otherwise.
 * Designed for uptime monitors (Cloudflare Health Checks, BetterStack,
 * UptimeRobot) — no auth, no rate limit, but always-uncached.
 *
 * Returns DB status only — not a full dep-graph check. Adding more probes
 * (R2, QStash, Resend) here means each probe failing fails the health
 * check, which is usually wrong for monitoring (you want to alert on the
 * specific failure, not the rollup).
 */
import type { APIRoute } from "astro";
import { sql as raw } from "@/lib/db";

export const prerender = false;

export const GET: APIRoute = async () => {
  const t0 = Date.now();
  let db: "ok" | "fail" = "fail";
  let dbMs = 0;
  try {
    await raw`SELECT 1`;
    db = "ok";
    dbMs = Date.now() - t0;
  } catch {
    db = "fail";
  }
  const ok = db === "ok";
  const body = JSON.stringify({
    ok,
    db,
    db_ms: dbMs,
    version: import.meta.env.PUBLIC_BUILD_ID ?? "dev",
    ts: new Date().toISOString(),
  });
  return new Response(body, {
    status: ok ? 200 : 503,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
};
