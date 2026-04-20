import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cannedReplies } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const body = (await request.json().catch(() => ({}))) as {
    slug?: unknown;
    title?: unknown;
    body?: unknown;
    category?: unknown;
    locale?: unknown;
  };
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!slug || !title || !text) {
    return NextResponse.json({ error: "slug, title, body required" }, { status: 400 });
  }

  const [row] = await db
    .insert(cannedReplies)
    .values({
      slug,
      title,
      body: text,
      category: typeof body.category === "string" ? body.category : null,
      locale: typeof body.locale === "string" ? body.locale : "en",
    })
    .returning();

  await recordAudit({
    actor: session.email,
    action: "canned.create",
    entityType: "canned_reply",
    entityId: row.id,
    request,
  });

  return NextResponse.json({ ok: true, row });
}
