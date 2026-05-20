import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { specialties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;
  const rows = await db.select().from(specialties).orderBy(specialties.sortOrder);
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const slug = typeof body.slug === "string"
    ? body.slug.trim().toLowerCase().replace(/\s+/g, "-")
    : name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const [row] = await db
    .insert(specialties)
    .values({
      name,
      slug,
      description: typeof body.description === "string" ? body.description : null,
      iconUrl: typeof body.iconUrl === "string" ? body.iconUrl : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      parentSpecialtyId: body.parentSpecialtyId ? Number(body.parentSpecialtyId) : null,
      sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
      isActive: body.isActive !== false,
      metaTitle: typeof body.metaTitle === "string" ? body.metaTitle : null,
      metaDescription: typeof body.metaDescription === "string" ? body.metaDescription : null,
    })
    .returning();

  await recordAudit({ actor: session.email, action: "specialty.create", entityType: "specialty", entityId: row.id, diff: JSON.stringify({ name, slug }), request });
  return NextResponse.json({ ok: true, row }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.iconUrl !== undefined) updates.iconUrl = body.iconUrl || null;
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl || null;
  if (body.parentSpecialtyId !== undefined) updates.parentSpecialtyId = body.parentSpecialtyId ? Number(body.parentSpecialtyId) : null;
  if (body.sortOrder !== undefined) updates.sortOrder = Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0;
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
  if (body.metaTitle !== undefined) updates.metaTitle = body.metaTitle || null;
  if (body.metaDescription !== undefined) updates.metaDescription = body.metaDescription || null;

  const [updated] = await db.update(specialties).set(updates as Partial<typeof specialties.$inferInsert>).where(eq(specialties.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAudit({ actor: session.email, action: "specialty.update", entityType: "specialty", entityId: id, diff: JSON.stringify({ fields: Object.keys(body) }), request });
  return NextResponse.json({ ok: true, row: updated });
}

export async function DELETE(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(specialties).where(eq(specialties.id, id));
  await recordAudit({ actor: session.email, action: "specialty.delete", entityType: "specialty", entityId: id, request });
  return NextResponse.json({ ok: true });
}
