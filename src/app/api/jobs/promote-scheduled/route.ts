import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";
import { verifyQStashSignature } from "@/lib/qstash";

/**
 * Promote scheduled blog posts whose publish_at has passed into status='published'.
 * Idempotent — only flips rows still in status='scheduled' with a non-null
 * publish_at <= NOW().
 *
 * Auth modes mirror /api/jobs/run:
 *   - Bearer JOBS_TOKEN (manual / cron)
 *   - QStash signature (scheduled message)
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const bearer = request.headers.get("authorization");
  const token = process.env.JOBS_TOKEN;
  const bearerOk = token && bearer === `Bearer ${token}`;
  const qstashOk = await verifyQStashSignature(request, rawBody);

  if (!bearerOk && !qstashOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const promoted = await db
      .update(blogPosts)
      .set({
        status: "published",
        publishedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(blogPosts.status, "scheduled"),
          lte(blogPosts.publishAt, new Date())
        )
      )
      .returning({ id: blogPosts.id, slug: blogPosts.slug, title: blogPosts.title });

    return NextResponse.json({
      ok: true,
      promoted: promoted.length,
      posts: promoted,
    });
  } catch (err: any) {
    console.error("[promote-scheduled] failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to promote scheduled posts" },
      { status: 500 }
    );
  }
}

// Allow GET for easy manual cron triggering (still gated by bearer token)
export async function GET(request: NextRequest) {
  return POST(request);
}
