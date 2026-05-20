import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";
import { blogPostSchema, validateBody } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { session, res } = await requireAdmin();
  if (res || !session) return res!;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let rows = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt))
    .limit(200);

  if (status) {
    rows = rows.filter((r) => r.status === status);
  }

  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin("admin");
  if (res || !session) return res!;

  const parsed = await validateBody(request, blogPostSchema);
  if ("err" in parsed) return parsed.err;
  const body = parsed.data;

  const title = body.title.trim();
  const slug = body.slug?.trim().toLowerCase().replace(/\s+/g, "-")
    ?? title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const status = body.status ?? "draft";

  const [row] = await db
    .insert(blogPosts)
    .values({
      authorName: body.authorName?.trim() ?? null,
      title,
      slug,
      excerpt: body.excerpt?.trim() ?? null,
      content: body.content.trim(),
      coverImageUrl: body.coverImageUrl ?? null,
      category: body.category ?? null,
      tags: body.tags ?? null,
      status,
      publishedAt: status === "published" ? new Date() : null,
      metaTitle: body.metaTitle?.trim() ?? null,
      metaDescription: body.metaDescription?.trim() ?? null,
    })
    .returning();

  await recordAudit({
    actor: session.email,
    action: "blog_post.create",
    entityType: "blog_post",
    entityId: row.id,
    diff: JSON.stringify({ title, slug, status }),
    request,
  });

  return NextResponse.json({ ok: true, row }, { status: 201 });
}
