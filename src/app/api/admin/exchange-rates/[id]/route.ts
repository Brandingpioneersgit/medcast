import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeRates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const { id } = await params;
  const body = await request.json();
  const [updated] = await db.update(exchangeRates)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(exchangeRates.id, Number(id))).returning();
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
