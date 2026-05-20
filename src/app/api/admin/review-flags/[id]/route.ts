import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewFlags, patientReviews } from "@/lib/db/schema";
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
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action;
  if (action !== "upheld" && action !== "dismissed") {
    return NextResponse.json({ error: "action must be upheld or dismissed" }, { status: 400 });
  }

  const flag = await db.query.reviewFlags.findFirst({ where: eq(reviewFlags.id, id) });
  if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(reviewFlags)
    .set({
      status: action,
      resolvedAt: new Date(),
      resolvedBy: session.email,
    })
    .where(eq(reviewFlags.id, id));

  if (action === "upheld") {
    await db
      .update(patientReviews)
      .set({ isApproved: false })
      .where(eq(patientReviews.id, flag.reviewId));
  }

  await recordAudit({
    actor: session.email,
    action: `review_flag.${action}`,
    entityType: "review_flag",
    entityId: id,
    diff: JSON.stringify({ reviewId: flag.reviewId, action }),
    request,
  });

  return NextResponse.json({ ok: true });
}
