import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewFlags } from "@/lib/db/schema";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { logConsent } from "@/lib/consent";
import { broadcast } from "@/lib/broadcast";

export const runtime = "nodejs";

const ALLOWED_REASONS = new Set([
  "fake",
  "incorrect",
  "offensive",
  "spam",
  "not-a-patient",
  "other",
]);

type Body = {
  reviewId?: unknown;
  reason?: unknown;
  details?: unknown;
  reporterEmail?: unknown;
};

export async function POST(request: NextRequest) {
  const rl = rateLimit({
    key: `review-flag:${clientIp(request)}`,
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooMany(rl.reset);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reviewId = Number(body.reviewId);
  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    return NextResponse.json({ error: "Valid reviewId required" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!ALLOWED_REASONS.has(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  const details = typeof body.details === "string" ? body.details.slice(0, 1000) : null;
  const reporterEmail =
    typeof body.reporterEmail === "string" && body.reporterEmail.includes("@")
      ? body.reporterEmail.trim().slice(0, 320)
      : null;

  try {
    const [row] = await db
      .insert(reviewFlags)
      .values({
        reviewId,
        reason,
        details,
        reporterEmail,
        ipAddress: clientIp(request),
        status: "pending",
      })
      .returning({ id: reviewFlags.id });

    logConsent({
      purpose: "review_flag",
      identifier: reporterEmail,
      consentText: "I confirm this report is made in good faith.",
      request,
    });

    broadcast("review.flagged", {
      id: row?.id,
      reviewId,
      reason,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, id: row?.id });
  } catch (err) {
    console.error("review-flag insert failed:", err);
    return NextResponse.json({ error: "Could not record flag" }, { status: 500 });
  }
}
