import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctors, doctorSpecialties } from "@/lib/db/schema";
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

  return NextResponse.json({ success: true, doctor }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data = await request.json();

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

  return NextResponse.json({ success: true, doctor });
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.update(doctors).set({ isActive: false }).where(eq(doctors.id, id));

  return NextResponse.json({ success: true });
}
