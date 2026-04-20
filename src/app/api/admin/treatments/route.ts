import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { treatments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const data = await request.json();

  const [treatment] = await db.insert(treatments).values({
    specialtyId: data.specialtyId,
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    procedureType: data.procedureType || null,
    averageDurationHours: data.averageDurationHours || null,
    hospitalStayDays: data.hospitalStayDays || null,
    recoveryDays: data.recoveryDays || null,
    successRatePercent: data.successRatePercent || null,
    anesthesiaType: data.anesthesiaType || null,
    isMinimallyInvasive: data.isMinimallyInvasive ?? false,
    requiresDonor: data.requiresDonor ?? false,
    isActive: data.isActive ?? true,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
  }).returning();

  return NextResponse.json({ success: true, treatment }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data = await request.json();

  const [treatment] = await db.update(treatments)
    .set({
      specialtyId: data.specialtyId,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      procedureType: data.procedureType || null,
      averageDurationHours: data.averageDurationHours || null,
      hospitalStayDays: data.hospitalStayDays || null,
      recoveryDays: data.recoveryDays || null,
      successRatePercent: data.successRatePercent || null,
      anesthesiaType: data.anesthesiaType || null,
      isMinimallyInvasive: data.isMinimallyInvasive ?? false,
      requiresDonor: data.requiresDonor ?? false,
      isActive: data.isActive ?? true,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      updatedAt: new Date(),
    })
    .where(eq(treatments.id, id))
    .returning();

  return NextResponse.json({ success: true, treatment });
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.update(treatments).set({ isActive: false }).where(eq(treatments.id, id));

  return NextResponse.json({ success: true });
}
