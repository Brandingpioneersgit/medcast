import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { treatmentPackages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const { id } = await params;
  const body = await request.json();
  const [updated] = await db.update(treatmentPackages)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(treatmentPackages.id, Number(id))).returning();
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const { id } = await params;
  await db.delete(treatmentPackages).where(eq(treatmentPackages.id, Number(id)));
  return NextResponse.json({ ok: true });
}
