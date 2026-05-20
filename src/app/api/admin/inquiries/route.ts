import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactInquiries } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const STATUSES = ["new", "contacted", "qualified", "converted", "closed", "price_watch"] as const;
type Status = typeof STATUSES[number];

export async function GET(request: NextRequest) {
  const { res } = await requireAdmin(); if (res) return res!;
  const { searchParams } = new URL(request.url);

  const rows = await db
    .select()
    .from(contactInquiries)
    .orderBy(desc(contactInquiries.createdAt))
    .limit(200);

  return NextResponse.json({ rows });
}

export async function PATCH(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.status && STATUSES.includes(body.status)) {
    updates.status = body.status;
  }
  if (typeof body.assignedTo === "string") {
    updates.assignedTo = body.assignedTo;
  }
  if (typeof body.internalNotes === "string") {
    updates.internalNotes = body.internalNotes;
  }

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
    diff: JSON.stringify({ status: body.status, assignedTo: body.assignedTo }),
    request,
  });

  return NextResponse.json({ ok: true, row: updated });
}
