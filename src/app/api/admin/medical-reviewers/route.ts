import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { medicalReviewers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;
  const rows = await db.select().from(medicalReviewers).orderBy(asc(medicalReviewers.sortOrder));
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const [created] = await db.insert(medicalReviewers).values({
    fullName: body.fullName,
    slug: body.slug,
    credentials: body.credentials ?? null,
    jobTitle: body.jobTitle ?? null,
    bio: body.bio ?? null,
    imageUrl: body.imageUrl ?? null,
    specialties: body.specialties ?? null,
    licenseNumber: body.licenseNumber ?? null,
    licenseCountry: body.licenseCountry ?? null,
    linkedinUrl: body.linkedinUrl ?? null,
    isActive: body.isActive ?? true,
    sortOrder: body.sortOrder ?? 0,
  }).returning();
  return NextResponse.json(created);
}
