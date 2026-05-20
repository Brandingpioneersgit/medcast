import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status) updates.status = data.status;
  if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo || null;
  if (data.confirmedDate) updates.confirmedDate = new Date(data.confirmedDate);
  if (data.cancellationReason !== undefined) updates.cancellationReason = data.cancellationReason || null;

  await db.update(appointments).set(updates).where(eq(appointments.id, id));
  return NextResponse.json({ success: true });
}
