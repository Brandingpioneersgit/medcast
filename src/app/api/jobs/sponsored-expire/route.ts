import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hospitals } from "@/lib/db/schema";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.JOBS_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const toDemote = await db
    .select({ id: hospitals.id, name: hospitals.name, featuredUntil: hospitals.featuredUntil })
    .from(hospitals)
    .where(
      and(
        eq(hospitals.isFeatured, true),
        isNotNull(hospitals.featuredUntil),
        lt(hospitals.featuredUntil, now)
      )
    )
    .limit(500);

  if (toDemote.length === 0) {
    return NextResponse.json({ demoted: 0 });
  }

  await Promise.all(
    toDemote.map((h) =>
      db
        .update(hospitals)
        .set({ isFeatured: false, featuredUntil: null, updatedAt: now })
        .where(eq(hospitals.id, h.id))
    )
  );

  await recordAudit({
    action: "hospital.sponsored_expire",
    entityType: "hospital",
    actor: "cron",
    diff: JSON.stringify({ ids: toDemote.map((h) => h.id), count: toDemote.length }),
    request: req,
  });

  return NextResponse.json({ demoted: toDemote.length });
}

export async function GET(req: NextRequest) {
  // manual run for ops
  return POST(req);
}
