import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/db/queries";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

const MAX_QUERY_LENGTH = 100;

/**
 * Escape LIKE-pattern wildcards in user input. Drizzle's `ilike()`
 * parameterizes the value but doesn't escape `%` and `_` — without this,
 * a query of "%" matches every row and a query of "_" matches every
 * single-char name.
 */
function sanitizeQuery(raw: string): string {
  return raw
    .slice(0, MAX_QUERY_LENGTH)
    .trim()
    // Backslash-escape pattern wildcards so they're treated as literals.
    .replace(/[%_\\]/g, (m) => "\\" + m);
}

export async function GET(request: NextRequest) {
  const rl = rateLimit({ key: `search:${clientIp(request)}`, limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.reset);

  const raw = request.nextUrl.searchParams.get("q");
  if (!raw || raw.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const query = sanitizeQuery(raw);
  if (query.length < 2) {
    // After stripping wildcards the query may be too short.
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await globalSearch(query, 10);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    // Return 200 + empty results — we don't want to leak server state to
    // callers who might be probing for info-disclosure.
    return NextResponse.json({ results: [] });
  }
}
