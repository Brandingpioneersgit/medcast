import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { referralCodes } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;
  const rows = await db.select().from(referralCodes).orderBy(asc(referralCodes.createdAt));
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const [created] = await db.insert(referralCodes).values({
    code: body.code,
    patientName: body.patientName ?? null,
    patientEmail: body.patientEmail ?? null,
    patientPhone: body.patientPhone ?? null,
    rewardType: body.rewardType ?? "cash",
    rewardAmountUsd: body.rewardAmountUsd ?? null,
    maxUses: body.maxUses ?? null,
    expiresAt: body.expiresAt ?? null,
    isActive: body.isActive ?? true,
  }).returning();
  return NextResponse.json(created);
}
