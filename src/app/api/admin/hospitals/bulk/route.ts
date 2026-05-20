import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hospitals } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Action = "activate" | "deactivate" | "feature" | "unfeature";
const ACTIONS: Record<Action, Record<string, unknown>> = {
  activate: { isActive: true },
  deactivate: { isActive: false },
  feature: { isFeatured: true },
  unfeature: { isFeatured: false, featuredUntil: null },
};

export async function PATCH(request: NextRequest) {
  const session = await requireAuth();

  let body: { ids?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0) : [];
  const action = body.action as Action;
  if (ids.length === 0) return NextResponse.json({ error: "No ids" }, { status: 400 });
  if (!(action in ACTIONS)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (ids.length > 500) return NextResponse.json({ error: "Max 500 per bulk" }, { status: 400 });

  const updates = { ...ACTIONS[action], updatedAt: new Date() };
  await db.update(hospitals).set(updates).where(inArray(hospitals.id, ids));

  await recordAudit({
    actor: session.email,
    action: `hospital.bulk.${action}`,
    entityType: "hospital",
    diff: JSON.stringify({ ids, count: ids.length }),
    request,
  });

  return NextResponse.json({ ok: true, count: ids.length });
}
