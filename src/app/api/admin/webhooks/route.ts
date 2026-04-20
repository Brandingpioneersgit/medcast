import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { webhookSubscriptions } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    url?: unknown;
    secret?: unknown;
    events?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const events = typeof body.events === "string" ? body.events.trim() : "*";
  if (!name || !url) return NextResponse.json({ error: "name + url required" }, { status: 400 });
  if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: "url must be http(s)" }, { status: 400 });

  const secret =
    typeof body.secret === "string" && body.secret.trim()
      ? body.secret.trim()
      : crypto.randomBytes(24).toString("hex");

  const [row] = await db
    .insert(webhookSubscriptions)
    .values({ name, url, events, secret, createdBy: session.email })
    .returning();

  await recordAudit({
    actor: session.email,
    action: "webhook.create",
    entityType: "webhook_subscription",
    entityId: row.id,
    request,
  });

  return NextResponse.json({ ok: true, subscription: row });
}
