import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { patientReviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof data.isApproved === "boolean") updates.isApproved = data.isApproved;
  if (typeof data.isVerified === "boolean") updates.isVerified = data.isVerified;
  if (data.moderationNote !== undefined) updates.moderationNote = data.moderationNote || null;

  await db.update(patientReviews).set(updates).where(eq(patientReviews.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(patientReviews).where(eq(patientReviews.id, id));
  return NextResponse.json({ success: true });
}
