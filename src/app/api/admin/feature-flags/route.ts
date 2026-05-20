import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { setFlag } from "@/lib/flags";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Body = {
  key?: unknown;
  description?: unknown;
  enabled?: unknown;
  rolloutPercent?: unknown;
  locales?: unknown;
  roles?: unknown;
};

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const body = (await request.json().catch(() => ({}))) as Body;

  const key = typeof body.key === "string" ? body.key.trim().toLowerCase() : "";
  if (!/^[a-z0-9._-]+$/.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const pct = Math.max(0, Math.min(100, Math.round(Number(body.rolloutPercent) || 0)));

  await setFlag(key, {
    description: typeof body.description === "string" ? body.description : null,
    enabled: Boolean(body.enabled),
    rolloutPercent: pct,
    locales: typeof body.locales === "string" ? body.locales : null,
    roles: typeof body.roles === "string" ? body.roles : null,
    updatedBy: session.email,
  });

  await recordAudit({
    actor: session.email,
    action: "flag.upsert",
    entityType: "feature_flag",
    diff: JSON.stringify({
      key,
      enabled: Boolean(body.enabled),
      rolloutPercent: pct,
    }),
    request,
  });

  return NextResponse.json({ ok: true });
}
