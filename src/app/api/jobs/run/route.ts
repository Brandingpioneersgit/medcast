import { NextRequest, NextResponse } from "next/server";
import { runDueJobs } from "@/lib/jobs";
import { verifyQStashSignature } from "@/lib/qstash";

/**
 * Two auth modes:
 * 1. Plain bearer token (`Authorization: Bearer $JOBS_TOKEN`) — for manual/cron.
 * 2. QStash signature (`Upstash-Signature`) — for scheduled messages from QStash.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const bearer = request.headers.get("authorization");
  const token = process.env.JOBS_TOKEN;
  const bearerOk = token && bearer === `Bearer ${token}`;
  const qstashOk = await verifyQStashSignature(request, rawBody);

  if (!bearerOk && !qstashOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") || 10);
  const result = await runDueJobs(limit);
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  // GET path keeps bearer-only (no body to sign).
  const bearer = request.headers.get("authorization");
  const token = process.env.JOBS_TOKEN;
  if (token && bearer !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = Number(request.nextUrl.searchParams.get("limit") || 10);
  const result = await runDueJobs(limit);
  return NextResponse.json(result);
}

export const runtime = "nodejs";
export const maxDuration = 300;
