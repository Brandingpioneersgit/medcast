import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactInquiries, hospitals, treatments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { verifyQStashSignature } from "@/lib/qstash";
import type { FollowupStep } from "@/lib/followups";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const ok = await verifyQStashSignature(request, rawBody);
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let payload: { inquiryId?: number; step?: FollowupStep };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { inquiryId, step } = payload;
  if (!inquiryId || !step) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const inquiry = await db.query.contactInquiries.findFirst({
    where: eq(contactInquiries.id, inquiryId),
  });
  if (!inquiry || !inquiry.email) return NextResponse.json({ skipped: "no email" });

  // Skip if the inquiry already closed (booked or cancelled).
  if (["booked", "traveled", "completed", "cancelled"].includes(inquiry.status)) {
    return NextResponse.json({ skipped: `status=${inquiry.status}` });
  }

  const [hospital, treatment] = await Promise.all([
    inquiry.hospitalId ? db.query.hospitals.findFirst({ where: eq(hospitals.id, inquiry.hospitalId), columns: { name: true, slug: true } }) : null,
    inquiry.treatmentId ? db.query.treatments.findFirst({ where: eq(treatments.id, inquiry.treatmentId), columns: { name: true, slug: true } }) : null,
  ]);

  const subject = subjectFor(step, { treatmentName: treatment?.name, hospitalName: hospital?.name });
  const html = bodyFor(step, {
    name: inquiry.name,
    treatmentName: treatment?.name,
    hospitalName: hospital?.name,
    treatmentSlug: treatment?.slug,
    hospitalSlug: hospital?.slug,
  });

  try {
    await sendEmail({ to: inquiry.email, subject, html });
    return NextResponse.json({ sent: true, step, inquiryId });
  } catch (e) {
    console.error(`[followup] send failed for inquiry ${inquiryId} step ${step}:`, e);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }
}

function subjectFor(step: FollowupStep, ctx: { treatmentName?: string; hospitalName?: string }) {
  const subject = ctx.treatmentName ? ` (${ctx.treatmentName})` : "";
  switch (step) {
    case "day1": return `Your personalized quote${subject} — MedCasts`;
    case "day3": return `Patient stories${subject} · still here to help`;
    case "day7": return `Free second opinion available${subject}`;
    case "day14": return `One last check-in${subject} — let us know how we can help`;
  }
}

function bodyFor(step: FollowupStep, ctx: {
  name: string;
  treatmentName?: string;
  hospitalName?: string;
  treatmentSlug?: string;
  hospitalSlug?: string;
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com";
  const treatmentLink = ctx.treatmentSlug ? `${site}/treatment/${ctx.treatmentSlug}` : `${site}/treatments`;
  const hospitalLink = ctx.hospitalSlug ? `${site}/hospital/${ctx.hospitalSlug}` : `${site}/hospitals`;
  const first = ctx.name.split(" ")[0] || ctx.name;

  const common = `<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:auto;color:#1f2937;">
    <p>Hi ${escapeHtml(first)},</p>`;

  const footer = `<p style="color:#6b7280;font-size:12px;margin-top:32px;">
    Reply STOP or email <a href="mailto:info@medcasts.com">info@medcasts.com</a> to stop follow-ups.<br/>
    MedCasts — Medical Assistance, Worldwide.
  </p></div>`;

  switch (step) {
    case "day1":
      return `${common}
        <p>We've matched your request with top hospitals${ctx.treatmentName ? ` for <b>${escapeHtml(ctx.treatmentName)}</b>` : ""}.</p>
        <p>Your dedicated case manager will WhatsApp you with a detailed quote within the hour. Meanwhile, you can review the top options:</p>
        <p><a href="${treatmentLink}" style="background:#0d9488;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;">Review options</a></p>
      ${footer}`;

    case "day3":
      return `${common}
        <p>Deciding on medical treatment is a big step — we know. Here are patient stories from people who recently travelled for ${escapeHtml(ctx.treatmentName || "treatment")}:</p>
        <p><a href="${site}/testimonials" style="color:#0d9488;font-weight:600;">Read 3 patient journeys →</a></p>
        <p>Any questions? Just reply to this email.</p>
      ${footer}`;

    case "day7":
      return `${common}
        <p>Still undecided? Our JCI specialists offer a <b>free written second opinion</b> in 48 hours — no obligation.</p>
        <p><a href="${site}/second-opinion" style="background:#0d9488;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;">Request free second opinion</a></p>
      ${footer}`;

    case "day14":
      return `${common}
        <p>Two weeks since your enquiry — we don't want to be pushy, so this is our last check-in.</p>
        <p>If your plans have changed or the timing isn't right, no worries. If you'd still like help, just reply and we'll pick up where we left off.</p>
      ${footer}`;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}
