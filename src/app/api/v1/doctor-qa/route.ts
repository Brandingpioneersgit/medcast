import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctorQa } from "@/lib/db/schema";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { logConsent } from "@/lib/consent";
import { broadcast } from "@/lib/broadcast";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 160);
}

export async function POST(request: NextRequest) {
  const rl = rateLimit({
    key: `qa:${clientIp(request)}`,
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooMany(rl.reset);

  const body = (await request.json().catch(() => ({}))) as {
    question?: unknown;
    doctorId?: unknown;
    specialtyId?: unknown;
    askerName?: unknown;
    askerCountry?: unknown;
    askerEmail?: unknown;
    locale?: unknown;
  };

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 15 || question.length > 1500) {
    return NextResponse.json(
      { error: "Question must be 15–1500 characters" },
      { status: 400 }
    );
  }

  const doctorId = Number(body.doctorId);
  const specialtyId = Number(body.specialtyId);
  const askerName = typeof body.askerName === "string" ? body.askerName.trim().slice(0, 120) : null;
  const askerCountry = typeof body.askerCountry === "string" ? body.askerCountry.trim().slice(0, 60) : null;
  const askerEmail =
    typeof body.askerEmail === "string" && body.askerEmail.includes("@")
      ? body.askerEmail.trim().slice(0, 320)
      : null;
  const locale = typeof body.locale === "string" ? body.locale.slice(0, 10) : "en";

  const baseSlug = slugify(question);
  const slug = `${baseSlug || "question"}-${Date.now().toString(36).slice(-4)}`;

  try {
    const [row] = await db
      .insert(doctorQa)
      .values({
        slug,
        doctorId: Number.isFinite(doctorId) && doctorId > 0 ? doctorId : null,
        specialtyId: Number.isFinite(specialtyId) && specialtyId > 0 ? specialtyId : null,
        askerName,
        askerCountry,
        askerEmail,
        question,
        status: "pending",
        locale,
      })
      .returning({ id: doctorQa.id, slug: doctorQa.slug });

    logConsent({
      purpose: "review_submit",
      identifier: askerEmail,
      consentText: "I consent to publish this question publicly with my first name.",
      request,
    });

    broadcast("qa.submitted", {
      id: row?.id,
      slug: row?.slug,
      question: question.slice(0, 200),
      askerCountry,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, id: row?.id, slug: row?.slug });
  } catch (err) {
    console.error("doctor-qa insert failed:", err);
    return NextResponse.json({ error: "Could not save question" }, { status: 500 });
  }
}
