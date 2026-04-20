import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendTestWebhook } from "@/lib/webhooks";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const result = await sendTestWebhook(id);
  await recordAudit({
    actor: session.email,
    action: "webhook.test",
    entityType: "webhook_subscription",
    entityId: id,
    diff: JSON.stringify({ ok: result.ok, status: result.status }),
    request,
  });
  return NextResponse.json(result);
}
