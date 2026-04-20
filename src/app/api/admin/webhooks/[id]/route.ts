import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webhookSubscriptions } from "@/lib/db/schema";
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
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.url === "string") updates.url = body.url;
  if (typeof body.events === "string") updates.events = body.events;
  if (typeof body.secret === "string") updates.secret = body.secret;

  await db.update(webhookSubscriptions).set(updates).where(eq(webhookSubscriptions.id, id));

  await recordAudit({
    actor: session.email,
    action: "webhook.update",
    entityType: "webhook_subscription",
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
  await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id));
  await recordAudit({
    actor: session.email,
    action: "webhook.delete",
    entityType: "webhook_subscription",
    entityId: id,
    request,
  });
  return NextResponse.json({ ok: true });
}
