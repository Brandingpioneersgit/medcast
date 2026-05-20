import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { replayDelivery } from "@/lib/webhooks";
import { recordAudit } from "@/lib/admin/audit";

// POST { id } — replay a recorded webhook delivery.
// Records a fresh delivery row so the replay is auditable + retry-counted.
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Missing or invalid delivery id" }, { status: 400 });
  }

  const result = await replayDelivery(id);
  void recordAudit(session, "webhook.replay", {
    entityType: "webhook_delivery",
    entityId: id,
    diff: JSON.stringify({ status: result.status, ok: result.ok, error: result.error }),
  });

  // 200: the replay request itself succeeded; the delivery may still have
  // failed (caller checks `result.ok` to know whether the webhook returned 2xx).
  return Response.json(result, { status: 200 });
}
