import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactInquiries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.whatsappNumber !== undefined) updates.whatsappNumber = body.whatsappNumber;
  if (body.country !== undefined) updates.country = body.country;
  if (body.medicalConditionSummary !== undefined) updates.medicalConditionSummary = body.medicalConditionSummary;
  if (body.status !== undefined) updates.status = body.status;
  if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
  if (body.internalNotes !== undefined) updates.internalNotes = body.internalNotes;

  const [updated] = await db
    .update(contactInquiries)
    .set(updates as Partial<typeof contactInquiries.$inferInsert>)
    .where(eq(contactInquiries.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAudit({
    actor: session.email,
    action: "inquiry.update",
    entityType: "contact_inquiry",
    entityId: id,
    diff: JSON.stringify({ updatedFields: Object.keys(body) }),
    request,
  });

  return NextResponse.json({ ok: true, row: updated });
}

export async function DELETE(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(contactInquiries).where(eq(contactInquiries.id, id));

  await recordAudit({
    actor: session.email,
    action: "inquiry.delete",
    entityType: "contact_inquiry",
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
