import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { res } = await requireAdmin(); if (res) return res!;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const search = searchParams.get("search");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let rows = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(500);

  if (action) rows = rows.filter(r => r.action === action);
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(r =>
      r.actor?.toLowerCase().includes(s) ||
      r.action?.toLowerCase().includes(s) ||
      r.entityType?.toLowerCase().includes(s) ||
      r.diff?.toLowerCase().includes(s)
    );
  }
  if (from) rows = rows.filter(r => new Date(r.createdAt) >= new Date(from));
  if (to) rows = rows.filter(r => new Date(r.createdAt) <= new Date(to + "T23:59:59"));

  return NextResponse.json({ rows });
}