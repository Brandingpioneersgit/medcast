import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { amenities } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;
  const rows = await db.select().from(amenities).orderBy(asc(amenities.category), asc(amenities.name));
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const [created] = await db.insert(amenities).values({
    name: body.name,
    slug: body.slug,
    icon: body.icon ?? null,
    category: body.category ?? null,
  }).returning();
  return NextResponse.json(created);
}
