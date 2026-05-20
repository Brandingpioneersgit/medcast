import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctorQa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Body = { action?: unknown; answer?: unknown; answeredBy?: unknown };

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
  const body = (await request.json().catch(() => ({}))) as Body;
  const action = body.action;
  if (action !== "answered" && action !== "rejected") {
    return NextResponse.json({ error: "action must be answered or rejected" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status: action, updatedAt: new Date() };
  if (action === "answered") {
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (answer.length < 20) {
      return NextResponse.json({ error: "Answer must be at least 20 characters" }, { status: 400 });
    }
    updates.answer = answer;
    updates.answeredAt = new Date();
    updates.answeredBy = typeof body.answeredBy === "string" ? body.answeredBy.trim() : session.email;
  }

  await db.update(doctorQa).set(updates).where(eq(doctorQa.id, id));

  await recordAudit({
    actor: session.email,
    action: `qa.${action}`,
    entityType: "doctor_qa",
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
