import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cannedReplies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["slug", "title", "body", "category", "locale"] as const) {
    if (typeof body[k] === "string") updates[k] = body[k];
  }

  await db.update(cannedReplies).set(updates).where(eq(cannedReplies.id, id));

  await recordAudit({
    actor: session.email,
    action: "canned.update",
    entityType: "canned_reply",
    entityId: id,
    diff: JSON.stringify(Object.keys(updates)),
    request,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(cannedReplies).where(eq(cannedReplies.id, id));
  await recordAudit({
    actor: session.email,
    action: "canned.delete",
    entityType: "canned_reply",
    entityId: id,
    request,
  });
  return NextResponse.json({ ok: true });
}
