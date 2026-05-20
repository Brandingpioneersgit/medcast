import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { faqs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.question !== undefined) updates.question = body.question;
  if (body.answer !== undefined) updates.answer = body.answer;
  if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder);
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db
    .update(faqs)
    .set(updates as Partial<typeof faqs.$inferInsert>)
    .where(eq(faqs.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAudit({
    actor: session.email,
    action: "faq.update",
    entityType: "faq",
    entityId: id,
    diff: JSON.stringify({ fields: Object.keys(body) }),
    request,
  });

  return NextResponse.json({ ok: true, row: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db.delete(faqs).where(eq(faqs.id, id));

  await recordAudit({
    actor: session.email,
    action: "faq.delete",
    entityType: "faq",
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
