import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  hospitals,
  doctors,
  treatments,
  conditions,
  specialties,
  testimonials,
  blogPosts,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/admin/audit";

// Soft-delete (archive) endpoint. POST { entityType, entityId, archive: bool }.
// Sets `archivedAt` to NOW() (or NULL when un-archiving). Public queries
// already filter `archivedAt IS NULL`, so this hides the row from the site
// without losing its data.

const TABLE_MAP = {
  hospital: hospitals,
  doctor: doctors,
  treatment: treatments,
  condition: conditions,
  specialty: specialties,
  testimonial: testimonials,
  "blog-post": blogPosts,
  blog: blogPosts,
} as const;

type EntityType = keyof typeof TABLE_MAP;

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const { entityType, entityId, archive } = body as {
    entityType?: string;
    entityId?: number;
    archive?: boolean;
  };

  if (!entityType || !entityId || typeof archive !== "boolean") {
    return Response.json(
      { error: "entityType, entityId and archive (bool) are required" },
      { status: 400 }
    );
  }

  const table = TABLE_MAP[entityType as EntityType];
  if (!table) {
    return Response.json({ error: `Unknown entityType: ${entityType}` }, { status: 400 });
  }

  const [row] = await db
    .update(table as any)
    .set({ archivedAt: archive ? new Date() : null })
    .where(eq((table as any).id, entityId))
    .returning();

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  void recordAudit(session, archive ? `${entityType}.archive` : `${entityType}.restore`, {
    entityType,
    entityId,
    diff: JSON.stringify({ archivedAt: { from: archive ? null : "set", to: archive ? "set" : null } }),
  });

  return Response.json({ ok: true, entity: row });
}
