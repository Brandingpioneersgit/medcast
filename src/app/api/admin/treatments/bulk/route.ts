import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { treatments } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { requireCsrf } from "@/lib/csrf";

export const runtime = "nodejs";

type Action = "activate" | "deactivate" | "feature" | "unfeature";
const ACTIONS: Record<Action, Record<string, unknown>> = {
  activate: { isActive: true },
  deactivate: { isActive: false },
  feature: { isFeatured: true },
  unfeature: { isFeatured: false },
};

export async function PATCH(request: NextRequest) {
  const blocked = requireCsrf(request);
  if (blocked) return blocked;

  const { session, res } = await requireAdmin("admin");
  if (res || !session) return res!;

  const { ok, reset } = rateLimit({ key: `bulk:${clientIp(request)}`, limit: 20, windowMs: 60 * 1000 });
  if (!ok) return tooMany(reset);

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

  await db.update(treatments).set({ ...ACTIONS[action], updatedAt: new Date() }).where(inArray(treatments.id, ids));

  await recordAudit({
    actor: session.email,
    action: `treatment.bulk.${action}`,
    entityType: "treatment",
    diff: JSON.stringify({ ids, count: ids.length }),
    request,
  });

  return NextResponse.json({ ok: true, count: ids.length });
}