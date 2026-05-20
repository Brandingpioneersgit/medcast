import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { beforeAfterPhotos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const ACTIONS = ["approved", "rejected", "feature", "unfeature"] as const;
type Action = (typeof ACTIONS)[number];

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
  const body = (await request.json().catch(() => ({}))) as { action?: unknown };
  const action = body.action as Action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const row = await db.query.beforeAfterPhotos.findFirst({ where: eq(beforeAfterPhotos.id, id) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ((action === "approved" || action === "feature") && !row.consentRecorded) {
    return NextResponse.json(
      { error: "Cannot approve/feature: patient consent not recorded." },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (action === "approved" || action === "rejected") {
    updates.moderationStatus = action;
    updates.moderatedAt = new Date();
    updates.moderatedBy = session.email;
  } else if (action === "feature") {
    updates.isFeatured = true;
  } else if (action === "unfeature") {
    updates.isFeatured = false;
  }

  await db.update(beforeAfterPhotos).set(updates).where(eq(beforeAfterPhotos.id, id));

  await recordAudit({
    actor: session.email,
    action: `gallery.${action}`,
    entityType: "before_after_photo",
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
