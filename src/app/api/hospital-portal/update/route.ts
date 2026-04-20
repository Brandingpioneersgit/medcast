import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hospitals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/tokens";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

const ALLOWED: (keyof typeof hospitals.$inferInsert)[] = [
  "name", "description", "phone", "email", "website",
  "bedCapacity", "establishedYear", "airportDistanceKm", "coverImageUrl",
];

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rl = rateLimit({ key: `hp-update:${clientIp(request)}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.reset);

  const { token, patch } = await request.json();
  if (!token || !patch || typeof patch !== "object") {
    return NextResponse.json({ error: "missing token or patch" }, { status: 400 });
  }
  const claims = verifyToken<{ hospitalId: number; kind: string }>(token);
  if (!claims || claims.kind !== "hospital-portal") {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 401 });
  }

  const updates: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (k in patch) updates[k] = patch[k] === "" ? null : patch[k];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }
  updates.updatedAt = new Date();

  await db.update(hospitals).set(updates).where(eq(hospitals.id, claims.hospitalId));
  return NextResponse.json({ ok: true });
}
