import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { treatmentPackages, hospitals, treatments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;
  const rows = await db
    .select({
      id: treatmentPackages.id,
      name: treatmentPackages.name,
      slug: treatmentPackages.slug,
      packageType: treatmentPackages.packageType,
      basePriceUsd: treatmentPackages.basePriceUsd,
      stayNights: treatmentPackages.stayNights,
      hospitalId: treatmentPackages.hospitalId,
      treatmentId: treatmentPackages.treatmentId,
      hospitalName: hospitals.name,
      treatmentName: treatments.name,
      isActive: treatmentPackages.isActive,
    })
    .from(treatmentPackages)
    .leftJoin(hospitals, eq(hospitals.id, treatmentPackages.hospitalId))
    .leftJoin(treatments, eq(treatments.id, treatmentPackages.treatmentId))
    .orderBy(desc(treatmentPackages.createdAt));
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const [created] = await db.insert(treatmentPackages).values({
    name: body.name,
    slug: body.slug,
    hospitalId: body.hospitalId,
    treatmentId: body.treatmentId,
    packageType: body.packageType,
    basePriceUsd: body.basePriceUsd,
    stayNights: body.stayNights ?? null,
    isActive: body.isActive ?? true,
  }).returning();
  return NextResponse.json(created);
}
