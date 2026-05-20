import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conditions } from "@/lib/db/schema";
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
  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.severityLevel !== undefined) updates.severityLevel = body.severityLevel || null;
  if (body.metaTitle !== undefined) updates.metaTitle = body.metaTitle || null;
  if (body.metaDescription !== undefined) updates.metaDescription = body.metaDescription || null;

  const [updated] = await db
    .update(conditions)
    .set(updates as Partial<typeof conditions.$inferInsert>)
    .where(eq(conditions.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAudit({
    actor: session.email,
    action: "condition.update",
    entityType: "condition",
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

  await db.delete(conditions).where(eq(conditions.id, id));

  await recordAudit({
    actor: session.email,
    action: "condition.delete",
    entityType: "condition",
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
