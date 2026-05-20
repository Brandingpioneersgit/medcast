import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewFlags, patientReviews } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { res } = await requireAdmin(); if (res) return res!;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = db
    .select({
      id: reviewFlags.id,
      reviewId: reviewFlags.reviewId,
      reason: reviewFlags.reason,
      details: reviewFlags.details,
      reporterEmail: reviewFlags.reporterEmail,
      status: reviewFlags.status,
      resolvedAt: reviewFlags.resolvedAt,
      resolvedBy: reviewFlags.resolvedBy,
      createdAt: reviewFlags.createdAt,
      reviewerName: patientReviews.reviewerName,
      reviewBody: patientReviews.body,
    })
    .from(reviewFlags)
    .leftJoin(patientReviews, eq(reviewFlags.reviewId, patientReviews.id))
    .orderBy(desc(reviewFlags.createdAt))
    .limit(200);

  const rows = await query;

  const filtered = status
    ? rows.filter((r) => r.status === status)
    : rows;

  return NextResponse.json({ rows: filtered });
}
