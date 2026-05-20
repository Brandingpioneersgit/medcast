import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conditions, specialties, treatments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireAdmin(); if (res) return res!;

  const rows = await db
    .select()
    .from(conditions)
    .orderBy(desc(conditions.name))
    .limit(200);

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
    .insert(conditions)
    .values({
      name,
      slug,
      description: typeof body.description === "string" ? body.description : null,
      severityLevel: typeof body.severityLevel === "string" ? body.severityLevel : null,
      metaTitle: typeof body.metaTitle === "string" ? body.metaTitle : null,
      metaDescription: typeof body.metaDescription === "string" ? body.metaDescription : null,
    })
    .returning();

  await recordAudit({
    actor: session.email,
    action: "condition.create",
    entityType: "condition",
    entityId: row.id,
    diff: JSON.stringify({ name, slug }),
    request,
  });

  return NextResponse.json({ ok: true, row }, { status: 201 });
}
