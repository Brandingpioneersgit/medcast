import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctors } from "@/lib/db/schema";
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
  const action = body.action;
  if (action !== "verify" && action !== "unverify") {
    return NextResponse.json({ error: "action must be verify or unverify" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (action === "verify") {
    updates.licenseVerified = true;
    updates.licenseVerifiedAt = new Date();
    if (typeof body.licenseNumber === "string") updates.licenseNumber = body.licenseNumber.trim() || null;
    if (typeof body.licenseCountry === "string") updates.licenseCountry = body.licenseCountry.trim() || null;
    if (typeof body.licenseRegistrar === "string") updates.licenseRegistrar = body.licenseRegistrar.trim() || null;
  } else {
    updates.licenseVerified = false;
    updates.licenseVerifiedAt = null;
  }

  await db.update(doctors).set(updates).where(eq(doctors.id, id));

  await recordAudit({
    actor: session.email,
    action: `doctor.license.${action}`,
    entityType: "doctor",
    entityId: id,
    diff: JSON.stringify({
      action,
      licenseCountry: updates.licenseCountry ?? null,
      licenseRegistrar: updates.licenseRegistrar ?? null,
    }),
    request,
  });

  return NextResponse.json({ ok: true });
}
