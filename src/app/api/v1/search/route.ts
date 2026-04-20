import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/db/queries";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = rateLimit({ key: `search:${clientIp(request)}`, limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.reset);

  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await globalSearch(query, 10);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
