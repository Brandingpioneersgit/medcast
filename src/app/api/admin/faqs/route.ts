import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { faqs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const ENTITY_TYPES = ["hospital", "treatment", "specialty", "condition", "doctor", "country"] as const;

export async function GET(request: NextRequest) {
  const { res } = await requireAdmin(); if (res) return res!;
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  let rows = await db
    .select()
    .from(faqs)
    .orderBy(desc(faqs.sortOrder), desc(faqs.createdAt))
    .limit(200);

  if (entityType) {
    rows = rows.filter((r) => r.entityType === entityType);
  }
  if (entityId) {
    rows = rows.filter((r) => r.entityId === Number(entityId));
  }

  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin(); if (res) return res!;
  const body = await request.json();

  const entityType = typeof body.entityType === "string" ? body.entityType : "";
  if (!ENTITY_TYPES.includes(entityType as typeof ENTITY_TYPES[number])) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!answer) return NextResponse.json({ error: "answer required" }, { status: 400 });

  const [row] = await db
    .insert(faqs)
    .values({
      entityType,
      entityId: Number(body.entityId) || 0,
      question,
      answer,
      sortOrder: Number(body.sortOrder) || 0,
      isActive: body.isActive !== false,
    })
    .returning();

  await recordAudit({
    actor: session.email,
    action: "faq.create",
    entityType: "faq",
    entityId: row.id,
    diff: JSON.stringify({ entityType, entityId: body.entityId }),
    request,
  });

  return NextResponse.json({ ok: true, row }, { status: 201 });
}
