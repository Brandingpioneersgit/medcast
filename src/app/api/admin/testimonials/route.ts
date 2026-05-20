import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testimonials, hospitals } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;

  const rows = await db
    .select({
      id: testimonials.id,
      patientName: testimonials.patientName,
      patientCountry: testimonials.patientCountry,
      patientAge: testimonials.patientAge,
      rating: testimonials.rating,
      title: testimonials.title,
      story: testimonials.story,
      isVerified: testimonials.isVerified,
      isFeatured: testimonials.isFeatured,
      isActive: testimonials.isActive,
      hospitalId: testimonials.hospitalId,
      hospitalName: hospitals.name,
      createdAt: testimonials.createdAt,
    })
    .from(testimonials)
    .leftJoin(hospitals, eq(testimonials.hospitalId, hospitals.id))
    .orderBy(desc(testimonials.createdAt))
    .limit(200);

  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();

  const patientName = typeof body.patientName === "string" ? body.patientName.trim() : "";
  if (!patientName) return NextResponse.json({ error: "patientName required" }, { status: 400 });

  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }

  const story = typeof body.story === "string" ? body.story.trim() : "";
  if (!story) return NextResponse.json({ error: "story required" }, { status: 400 });

  const [row] = await db
    .insert(testimonials)
    .values({
      patientName,
      patientCountry: typeof body.patientCountry === "string" ? body.patientCountry : null,
      patientAge: body.patientAge ? Number(body.patientAge) : null,
      rating,
      title: typeof body.title === "string" ? body.title.trim() : null,
      story,
      isVerified: body.isVerified === true,
      isFeatured: body.isFeatured === true,
      isActive: body.isActive !== false,
      hospitalId: body.hospitalId ? Number(body.hospitalId) : null,
      treatmentId: body.treatmentId ? Number(body.treatmentId) : null,
      doctorId: body.doctorId ? Number(body.doctorId) : null,
    })
    .returning();

  await recordAudit({
    actor: session.email,
    action: "testimonial.create",
    entityType: "testimonial",
    entityId: row.id,
    request,
  });

  return NextResponse.json({ ok: true, row }, { status: 201 });
}
