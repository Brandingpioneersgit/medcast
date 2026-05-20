import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";
import { assertNotStale, ConcurrencyError, concurrencyResponse } from "@/lib/admin/concurrency";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  const { session, res } = await requireAdmin("admin");
  if (res || !session) return res!;
  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await assertNotStale(blogPosts, id, body.expectedUpdatedAt);
  } catch (err) {
    if (err instanceof ConcurrencyError) return concurrencyResponse(err);
    throw err;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.excerpt !== undefined) updates.excerpt = body.excerpt || null;
  if (body.content !== undefined) updates.content = body.content;
  if (body.coverImageUrl !== undefined) updates.coverImageUrl = body.coverImageUrl || null;
  if (body.category !== undefined) updates.category = body.category || null;
  if (body.tags !== undefined) updates.tags = body.tags || null;
  if (body.authorName !== undefined) updates.authorName = body.authorName || null;
  if (body.metaTitle !== undefined) updates.metaTitle = body.metaTitle || null;
  if (body.metaDescription !== undefined) updates.metaDescription = body.metaDescription || null;

  const prev = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) });
  if (!prev) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStatus = body.status;
  if (newStatus && newStatus !== prev.status) {
    updates.status = newStatus;
    if (newStatus === "published" && !prev.publishedAt) {
      updates.publishedAt = new Date();
    }
  }

  // Scheduled publishing: when status moves to "scheduled", store publishAt.
  // The /api/jobs/promote-scheduled cron flips it to "published" once the
  // time arrives. If status is anything else, clear publishAt.
  if (body.publishAt !== undefined) {
    updates.publishAt =
      newStatus === "scheduled" || (!newStatus && prev.status === "scheduled")
        ? body.publishAt
          ? new Date(body.publishAt)
          : null
        : null;
  } else if (newStatus && newStatus !== "scheduled") {
    updates.publishAt = null;
  }

  const [updated] = await db
    .update(blogPosts)
    .set(updates as Partial<typeof blogPosts.$inferInsert>)
    .where(eq(blogPosts.id, id))
    .returning();

  await recordAudit({
    actor: session.email,
    action: "blog_post.update",
    entityType: "blog_post",
    entityId: id,
    diff: JSON.stringify({ fields: Object.keys(body) }),
    request,
  });

  return NextResponse.json({ ok: true, row: updated });
}

export async function DELETE(request: NextRequest) {
  const { session, res } = await requireAdmin("admin");
  if (res || !session) return res!;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(blogPosts).where(eq(blogPosts.id, id));

  await recordAudit({
    actor: session.email,
    action: "blog_post.delete",
    entityType: "blog_post",
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
