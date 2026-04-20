import { db } from "@/lib/db";
import { entityRevisions } from "@/lib/db/schema";

type SnapshotInput = {
  entityType: "hospital" | "doctor" | "treatment" | "specialty" | "blog_post";
  entityId: number;
  snapshot: Record<string, unknown>;
  changedBy?: string | null;
  changeSummary?: string | null;
};

/**
 * Record a point-in-time snapshot of an entity before/after edit.
 * Best-effort — never throws.
 */
export async function recordSnapshot(input: SnapshotInput): Promise<void> {
  try {
    await db.insert(entityRevisions).values({
      entityType: input.entityType,
      entityId: input.entityId,
      snapshot: JSON.stringify(input.snapshot),
      changedBy: input.changedBy ?? null,
      changeSummary: input.changeSummary ?? null,
    });
  } catch (err) {
    console.warn("[revisions] record failed (non-blocking):", err);
  }
}

export async function getRevisions(entityType: string, entityId: number, limit = 50) {
  try {
    const rows = await db.query.entityRevisions.findMany({
      where: (t, { and, eq }) => and(eq(t.entityType, entityType), eq(t.entityId, entityId)),
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit,
    });
    return rows;
  } catch {
    return [];
  }
}
