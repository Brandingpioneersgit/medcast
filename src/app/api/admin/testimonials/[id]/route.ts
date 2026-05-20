import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testimonials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.patientName !== undefined) updates.patientName = body.patientName;
  if (body.patientCountry !== undefined) updates.patientCountry = body.patientCountry;
  if (body.patientAge !== undefined) updates.patientAge = body.patientAge ? Number(body.patientAge) : null;
  if (body.rating !== undefined) updates.rating = Number(body.rating);
  if (body.title !== undefined) updates.title = body.title;
  if (body.story !== undefined) updates.story = body.story;
  if (body.isVerified !== undefined) updates.isVerified = body.isVerified;
  if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.hospitalId !== undefined) updates.hospitalId = body.hospitalId ? Number(body.hospitalId) : null;
  if (body.treatmentId !== undefined) updates.treatmentId = body.treatmentId ? Number(body.treatmentId) : null;
  if (body.doctorId !== undefined) updates.doctorId = body.doctorId ? Number(body.doctorId) : null;

  const [updated] = await db
    .update(testimonials)
    .set(updates as Partial<typeof testimonials.$inferInsert>)
    .where(eq(testimonials.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAudit({
    actor: session.email,
    action: "testimonial.update",
    entityType: "testimonial",
    entityId: id,
    diff: JSON.stringify({ fields: Object.keys(body) }),
    request,
  });

  return NextResponse.json({ ok: true, row: updated });
}

export async function DELETE(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db
    .update(testimonials)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(testimonials.id, id));

  await recordAudit({
    actor: session.email,
    action: "testimonial.delete",
    entityType: "testimonial",
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
