import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accreditations } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;
  const rows = await db.select().from(accreditations).orderBy(asc(accreditations.name));
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const [created] = await db.insert(accreditations).values({
    name: body.name,
    slug: body.slug,
    acronym: body.acronym ?? null,
    logoUrl: body.logoUrl ?? null,
    description: body.description ?? null,
    website: body.website ?? null,
  }).returning();
  return NextResponse.json(created);
}
