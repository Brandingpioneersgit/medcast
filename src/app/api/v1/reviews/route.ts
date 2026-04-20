import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientReviews } from "@/lib/db/schema";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { logConsent } from "@/lib/consent";
import { broadcast } from "@/lib/broadcast";

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit({ key: `rev:${clientIp(request)}`, limit: 5, windowMs: 60_000 });
    if (!rl.ok) return tooMany(rl.reset);
    const body = await request.json();
    const { reviewerName, reviewerEmail, reviewerCountry, rating, title, bodyText, doctorId, hospitalId, treatmentId, treatmentDate } = body;

    const ipForCaptcha = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    if (!(await verifyTurnstile(body.turnstileToken, ipForCaptcha))) {
      return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
    }

    if (!reviewerName || !bodyText || !rating) {
      return NextResponse.json({ error: "Name, rating and review body required" }, { status: 400 });
    }
    const r = Number(rating);
    if (r < 1 || r > 5) return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    if (!doctorId && !hospitalId) return NextResponse.json({ error: "Doctor or hospital required" }, { status: 400 });

    const [review] = await db.insert(patientReviews).values({
      doctorId: doctorId || null,
      hospitalId: hospitalId || null,
      treatmentId: treatmentId || null,
      reviewerName: reviewerName.trim(),
      reviewerEmail: reviewerEmail?.trim() || null,
      reviewerCountry: reviewerCountry?.trim() || null,
      rating: r,
      title: title?.trim() || null,
      body: bodyText.trim(),
      treatmentDate: treatmentDate ? new Date(treatmentDate) : null,
      isApproved: false,
    }).returning({ id: patientReviews.id });

    logConsent({
      purpose: "review_submit",
      identifier: reviewerEmail?.trim() || reviewerName.trim(),
      consentText: "I consent to publish this review publicly once moderated.",
      request,
    });

    broadcast("review.new", {
      id: review.id,
      reviewerName: reviewerName.trim(),
      rating: r,
      doctorId: doctorId ?? null,
      hospitalId: hospitalId ?? null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: review.id }, { status: 201 });
  } catch (err) {
    console.error("Review error:", err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
