import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeRates } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;
  const rows = await db.select().from(exchangeRates).orderBy(asc(exchangeRates.currencyCode));
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const [created] = await db.insert(exchangeRates).values({
    currencyCode: body.currencyCode,
    rateToUsd: body.rateToUsd,
  }).returning();
  return NextResponse.json(created);
}
