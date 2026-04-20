import { NextRequest, NextResponse } from "next/server";
import { pingIndexNow, getIndexNowKey } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.JOBS_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!getIndexNowKey()) {
    return NextResponse.json(
      { error: "INDEXNOW_KEY not configured" },
      { status: 503 }
    );
  }

  let body: { urls?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const raw = body.urls;
  if (!Array.isArray(raw) || raw.some((u) => typeof u !== "string")) {
    return NextResponse.json(
      { error: "urls must be a string[] array" },
      { status: 400 }
    );
  }
  const urls = (raw as string[]).filter(Boolean);
  if (urls.length === 0) {
    return NextResponse.json({ error: "no urls" }, { status: 400 });
  }

  const result = await pingIndexNow(urls);
  return NextResponse.json({ ok: result.submitted > 0, ...result, urlCount: urls.length });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/indexnow",
    method: "POST",
    body: { urls: ["/path/one", "/path/two", "https://full.example.com/path"] },
    headers: { Authorization: "Bearer $JOBS_TOKEN" },
    configured: Boolean(getIndexNowKey()),
  });
}
