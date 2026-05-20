import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE = "csrf_token";

/**
 * Validate a CSRF token present in the request.
 * - GET/HEAD/OPTIONS: always pass
 * - All other methods: token in cookie must match x-csrf-token header
 * Returns a 403 Response if invalid, or null if the request is safe.
 */
export function requireCsrf(request: Request): Response | null {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return null;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const tokenHeader = request.headers.get("x-csrf-token") ?? "";

  const match = cookieHeader.match(new RegExp(`${CSRF_COOKIE}=([^;]+)`));
  if (!match) {
    return new Response(JSON.stringify({ error: "CSRF token missing" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  if (match[1] !== tokenHeader) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
