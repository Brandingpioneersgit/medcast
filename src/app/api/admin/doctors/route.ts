import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctors, doctorSpecialties } from "@/lib/db/schema";
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

  const [doctor] = await db.insert(doctors).values({
    hospitalId: data.hospitalId,
    name: data.name,
    slug: data.slug,
    title: data.title || null,
    qualifications: data.qualifications || null,
    experienceYears: data.experienceYears || null,
    patientsTreated: data.patientsTreated || null,
    rating: data.rating || "0",
    reviewCount: data.reviewCount || 0,
    imageUrl: data.imageUrl || null,
    bio: data.bio || null,
    consultationFeeUsd: data.consultationFeeUsd || null,
    availableForVideoConsult: data.availableForVideoConsult ?? false,
    languagesSpoken: data.languagesSpoken || null,
    isActive: data.isActive ?? true,
    isFeatured: data.isFeatured ?? false,
  }).returning();

  if (Array.isArray(data.specialtyIds) && data.specialtyIds.length > 0) {
    await db.insert(doctorSpecialties).values(
      data.specialtyIds.map((sid: number, i: number) => ({
        doctorId: doctor.id,
        specialtyId: sid,
        isPrimary: i === 0,
      }))
    );
  }

  await recordAudit({
    actor: session.email,
    action: "doctor.create",
    entityType: "doctor",
    entityId: doctor.id,
    diff: JSON.stringify({ created: { name: doctor.name, slug: doctor.slug, hospitalId: doctor.hospitalId } }),
    request,
  });

  return NextResponse.json({ success: true, doctor }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { session, res } = await requireSession();
  if (res || !session) return res!;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data = await request.json();
  const before = await db.query.doctors.findFirst({ where: eq(doctors.id, id) });

  try {
    await assertNotStale(doctors, id, data.expectedUpdatedAt);
  } catch (err) {
    if (err instanceof ConcurrencyError) return concurrencyResponse(err);
    throw err;
  }

  const [doctor] = await db.update(doctors)
    .set({
      hospitalId: data.hospitalId,
      name: data.name,
      slug: data.slug,
      title: data.title || null,
      qualifications: data.qualifications || null,
      experienceYears: data.experienceYears || null,
      patientsTreated: data.patientsTreated || null,
      rating: data.rating || "0",
      reviewCount: data.reviewCount || 0,
      imageUrl: data.imageUrl || null,
      bio: data.bio || null,
      consultationFeeUsd: data.consultationFeeUsd || null,
      availableForVideoConsult: data.availableForVideoConsult ?? false,
      languagesSpoken: data.languagesSpoken || null,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      updatedAt: new Date(),
    })
    .where(eq(doctors.id, id))
    .returning();

  if (Array.isArray(data.specialtyIds)) {
    await db.delete(doctorSpecialties).where(eq(doctorSpecialties.doctorId, id));
    if (data.specialtyIds.length > 0) {
      await db.insert(doctorSpecialties).values(
        data.specialtyIds.map((sid: number, i: number) => ({
          doctorId: id,
          specialtyId: sid,
          isPrimary: i === 0,
        }))
      );
    }
  }

  await recordAudit({
    actor: session.email,
    action: "doctor.update",
    entityType: "doctor",
    entityId: id,
    diff: JSON.stringify({ before: { name: before?.name, slug: before?.slug, isActive: before?.isActive, isFeatured: before?.isFeatured }, after: { name: doctor.name, slug: doctor.slug, isActive: doctor.isActive, isFeatured: doctor.isFeatured } }),
    request,
  });

  return NextResponse.json({ success: true, doctor });
}

export async function DELETE(request: NextRequest) {
  const { session, res } = await requireSession();
  if (res || !session) return res!;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.update(doctors).set({ isActive: false }).where(eq(doctors.id, id));

  await recordAudit({
    actor: session.email,
    action: "doctor.delete",
    entityType: "doctor",
    entityId: id,
    diff: JSON.stringify({ softDelete: true }),
    request,
  });

  return NextResponse.json({ success: true });
}
