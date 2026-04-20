import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactInquiries, hospitals, treatments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, renderInquiryEmail, renderPatientConfirmation } from "@/lib/email";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { scheduleInquiryFollowups } from "@/lib/followups";
import { logConsent } from "@/lib/consent";
import { broadcast } from "@/lib/broadcast";

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit({
      key: `inquiry:${clientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!rl.ok) return tooMany(rl.reset);
    const body = await request.json();

    const {
      name,
      email,
      phone,
      country,
      medicalConditionSummary,
      message,
      hospitalId,
      treatmentId,
      doctorId,
      sourcePage,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    const ipForCaptcha = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
    const captchaOk = await verifyTurnstile(body.turnstileToken, ipForCaptcha);
    if (!captchaOk) return NextResponse.json({ error: "Captcha failed. Please retry." }, { status: 400 });

    // Validate required fields
    if (!name || !phone || !country || !medicalConditionSummary) {
      return NextResponse.json(
        { error: "Name, phone, country, and medical condition are required" },
        { status: 400 }
      );
    }

    // Basic phone validation
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      return NextResponse.json(
        { error: "Please provide a valid phone number" },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = request.headers.get("user-agent") || "";

    const [inquiry] = await db
      .insert(contactInquiries)
      .values({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone.trim(),
        whatsappNumber: phone.trim(),
        country: country.trim(),
        medicalConditionSummary: medicalConditionSummary.trim(),
        message: message?.trim() || null,
        hospitalId: hospitalId || null,
        treatmentId: treatmentId || null,
        doctorId: doctorId || null,
        preferredContactMethod: "whatsapp",
        status: "new",
        sourcePage,
        utmSource,
        utmMedium,
        utmCampaign,
        ipAddress,
        userAgent,
      })
      .returning({ id: contactInquiries.id });

    const [hospitalRow, treatmentRow] = await Promise.all([
      hospitalId ? db.query.hospitals.findFirst({ where: eq(hospitals.id, hospitalId), columns: { name: true } }) : null,
      treatmentId ? db.query.treatments.findFirst({ where: eq(treatments.id, treatmentId), columns: { name: true } }) : null,
    ]);

    const adminTo = process.env.INQUIRY_NOTIFY_EMAIL || "admin@medcasts.com";
    const tasks: Promise<unknown>[] = [
      sendEmail({
        to: adminTo,
        subject: `New Inquiry: ${name.trim()}${treatmentRow?.name ? ` — ${treatmentRow.name}` : ""}`,
        html: renderInquiryEmail({
          name, email, phone, country, message,
          hospitalName: hospitalRow?.name, treatmentName: treatmentRow?.name,
        }),
      }).catch((e) => console.error("Admin email failed:", e)),
    ];
    if (email) {
      tasks.push(
        sendEmail({
          to: email,
          subject: "We received your inquiry — MedCasts",
          html: renderPatientConfirmation({ name, type: "inquiry" }),
        }).catch((e) => console.error("Patient email failed:", e))
      );
    }
    Promise.all(tasks);

    // Fire-and-forget — schedule day-1/3/7/14 follow-up sequence via QStash.
    // Silently no-ops when QStash isn't configured or the inquiry has no email.
    scheduleInquiryFollowups(inquiry.id, Boolean(email)).catch((e) =>
      console.warn("[inquiry] followup scheduling failed:", e)
    );

    logConsent({
      purpose: "inquiry",
      identifier: email?.trim() || phone.trim(),
      consentText: "I agree to be contacted about this treatment request.",
      sourcePage,
      request,
    });

    broadcast("inquiry.new", {
      id: inquiry.id,
      name: name.trim(),
      country: country.trim(),
      hospitalName: hospitalRow?.name,
      treatmentName: treatmentRow?.name,
      medicalConditionSummary: medicalConditionSummary.trim().slice(0, 200),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, inquiryId: inquiry.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Inquiry submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry. Please try again." },
      { status: 500 }
    );
  }
}
