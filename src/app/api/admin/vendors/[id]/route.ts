import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const fields: Record<string, unknown> = { updatedAt: new Date() };

  const allowlist: (keyof typeof vendors.$inferInsert)[] = [
    "kind", "name", "slug", "cityId", "hospitalId", "description",
    "contactName", "phone", "whatsapp", "email", "website",
    "languages", "priceFromUsd", "priceToUsd", "priceUnit",
    "rating", "imageUrl", "isActive", "isFeatured",
  ];

  for (const key of allowlist) {
    if (key in body) {
      (fields as Record<string, unknown>)[key] = body[key] ?? null;
    }
  }

  const [updated] = await db
    .update(vendors)
    .set(fields as Partial<typeof vendors.$inferInsert>)
    .where(eq(vendors.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, row: updated });
}