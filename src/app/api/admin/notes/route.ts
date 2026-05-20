import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { adminNotes } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/admin/audit";

// GET  ?entityType=hospital&entityId=42 — list notes for an entity
// POST body: { entityType, entityId, body, isPinned? } — create
// PATCH body: { id, body?, isPinned? } — update
// DELETE ?id=123 — remove

export async function GET(req: NextRequest) {
  await requireAuth();
  const sp = req.nextUrl.searchParams;
  const entityType = sp.get("entityType");
  const entityId = sp.get("entityId") ? Number(sp.get("entityId")) : null;
  if (!entityType || !entityId) {
    return Response.json({ error: "Missing entityType or entityId" }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(adminNotes)
    .where(and(eq(adminNotes.entityType, entityType), eq(adminNotes.entityId, entityId)))
    .orderBy(desc(adminNotes.isPinned), desc(adminNotes.createdAt));
  return Response.json({ notes: rows });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const { entityType, entityId, body: text, isPinned } = body;
  if (!entityType || !entityId || !text || typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "entityType, entityId and non-empty body are required" }, { status: 400 });
  }
  const [row] = await db
    .insert(adminNotes)
    .values({
      entityType,
      entityId: Number(entityId),
      body: text.trim(),
      actor: session.email,
      isPinned: !!isPinned,
    })
    .returning();
  void recordAudit(session, "note.create", { entityType, entityId: Number(entityId), after: row });
  return Response.json({ note: row }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const { id, body: text, isPinned } = body;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (typeof text === "string" && text.trim()) updates.body = text.trim();
  if (typeof isPinned === "boolean") updates.isPinned = isPinned;

  const [row] = await db
    .update(adminNotes)
    .set(updates)
    .where(eq(adminNotes.id, Number(id)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  void recordAudit(session, "note.update", {
    entityType: row.entityType,
    entityId: row.entityId,
    after: row,
  });
  return Response.json({ note: row });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAuth();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const [removed] = await db
    .delete(adminNotes)
    .where(eq(adminNotes.id, Number(id)))
    .returning();
  if (!removed) return Response.json({ error: "Not found" }, { status: 404 });
  void recordAudit(session, "note.delete", {
    entityType: removed.entityType,
    entityId: removed.entityId,
    before: removed,
  });
  return Response.json({ ok: true });
}
