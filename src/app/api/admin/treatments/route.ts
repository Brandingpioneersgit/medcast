import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { treatments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";
import { assertNotStale, ConcurrencyError, concurrencyResponse } from "@/lib/admin/concurrency";

async function requireSession() {
  const session = await getSession();
  if (!session) return { session: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { session, res: null };
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireSession();
  if (res || !session) return res!;

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

  await recordAudit({
    actor: session.email,
    action: "treatment.create",
    entityType: "treatment",
    entityId: treatment.id,
    diff: JSON.stringify({ created: { name: treatment.name, slug: treatment.slug, specialtyId: treatment.specialtyId } }),
    request,
  });

  return NextResponse.json({ success: true, treatment }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { session, res } = await requireSession();
  if (res || !session) return res!;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data = await request.json();
  const before = await db.query.treatments.findFirst({ where: eq(treatments.id, id) });

  try {
    await assertNotStale(treatments, id, data.expectedUpdatedAt);
  } catch (err) {
    if (err instanceof ConcurrencyError) return concurrencyResponse(err);
    throw err;
  }

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

  await recordAudit({
    actor: session.email,
    action: "treatment.update",
    entityType: "treatment",
    entityId: id,
    diff: JSON.stringify({
      before: { name: before?.name, slug: before?.slug, isActive: before?.isActive, specialtyId: before?.specialtyId },
      after: { name: treatment.name, slug: treatment.slug, isActive: treatment.isActive, specialtyId: treatment.specialtyId },
    }),
    request,
  });

  return NextResponse.json({ success: true, treatment });
}

export async function DELETE(request: NextRequest) {
  const { session, res } = await requireSession();
  if (res || !session) return res!;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.update(treatments).set({ isActive: false }).where(eq(treatments.id, id));

  await recordAudit({
    actor: session.email,
    action: "treatment.delete",
    entityType: "treatment",
    entityId: id,
    diff: JSON.stringify({ softDelete: true }),
    request,
  });

  return NextResponse.json({ success: true });
}
