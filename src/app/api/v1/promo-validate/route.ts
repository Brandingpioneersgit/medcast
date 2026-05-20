import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promoCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rl = rateLimit({ key: `promo:${clientIp(request)}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.reset);

  const body = (await request.json().catch(() => ({}))) as {
    code?: unknown;
    orderTotalUsd?: unknown;
    treatmentId?: unknown;
    hospitalId?: unknown;
  };
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return NextResponse.json({ valid: false, error: "Code required" }, { status: 400 });

  const row = await db.query.promoCodes
    .findFirst({ where: eq(promoCodes.code, code) })
    .catch(() => null);
  if (!row) return NextResponse.json({ valid: false, error: "Unknown code" });
  if (!row.isActive) return NextResponse.json({ valid: false, error: "Code inactive" });

  const now = Date.now();
  if (row.validFrom && now < row.validFrom.getTime()) {
    return NextResponse.json({ valid: false, error: "Code not yet active" });
  }
  if (row.validUntil && now > row.validUntil.getTime()) {
    return NextResponse.json({ valid: false, error: "Code expired" });
  }
  if (row.maxUses != null && (row.usesCount ?? 0) >= row.maxUses) {
    return NextResponse.json({ valid: false, error: "Code fully redeemed" });
  }

  const orderTotal = Number(body.orderTotalUsd);
  const minOrder = row.minOrderUsd ? Number(row.minOrderUsd) : 0;
  if (Number.isFinite(orderTotal) && orderTotal < minOrder) {
    return NextResponse.json({
      valid: false,
      error: `Minimum order $${minOrder.toLocaleString()}`,
    });
  }

  const treatmentId = Number(body.treatmentId);
  const hospitalId = Number(body.hospitalId);
  if (row.appliesToTreatmentId && row.appliesToTreatmentId !== treatmentId) {
    return NextResponse.json({ valid: false, error: "Code does not apply to this treatment" });
  }
  if (row.appliesToHospitalId && row.appliesToHospitalId !== hospitalId) {
    return NextResponse.json({ valid: false, error: "Code does not apply to this hospital" });
  }

  const discountValue = Number(row.discountValue);
  let discountUsd = 0;
  if (row.discountType === "percent" && Number.isFinite(orderTotal)) {
    discountUsd = Math.round(orderTotal * (discountValue / 100));
  } else if (row.discountType === "fixed") {
    discountUsd = discountValue;
  }

  return NextResponse.json({
    valid: true,
    code: row.code,
    discountType: row.discountType,
    discountValue: discountValue,
    discountUsd,
    description: row.description,
  });
}
