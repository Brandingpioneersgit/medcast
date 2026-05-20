import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, doctors, hospitals, treatments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, renderPatientConfirmation } from "@/lib/email";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { logConsent } from "@/lib/consent";
import { broadcast } from "@/lib/broadcast";

function genCode() {
  return "APT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit({ key: `appt:${clientIp(request)}`, limit: 8, windowMs: 60_000 });
    if (!rl.ok) return tooMany(rl.reset);
    const body = await request.json();
    const {
      patientName, patientEmail, patientPhone, patientCountry,
      doctorId, hospitalId, treatmentId,
      preferredDate, alternativeDate, consultationType, notes,
    } = body;

    const ipForCaptcha = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    if (!(await verifyTurnstile(body.turnstileToken, ipForCaptcha))) {
      return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
    }

    if (!patientName || !patientPhone || !preferredDate) {
      return NextResponse.json({ error: "Name, phone and preferred date required" }, { status: 400 });
    }

    const [appt] = await db.insert(appointments).values({
      code: genCode(),
      doctorId: doctorId || null,
      hospitalId: hospitalId || null,
      treatmentId: treatmentId || null,
      patientName: patientName.trim(),
      patientEmail: patientEmail?.trim() || null,
      patientPhone: patientPhone.trim(),
      patientCountry: patientCountry?.trim() || null,
      preferredDate: new Date(preferredDate),
      alternativeDate: alternativeDate ? new Date(alternativeDate) : null,
      consultationType: consultationType || "in-person",
      notes: notes?.trim() || null,
      status: "requested",
    }).returning();

    const [doctor, hospital, treatment] = await Promise.all([
      doctorId ? db.query.doctors.findFirst({ where: eq(doctors.id, doctorId), columns: { name: true } }) : null,
      hospitalId ? db.query.hospitals.findFirst({ where: eq(hospitals.id, hospitalId), columns: { name: true } }) : null,
      treatmentId ? db.query.treatments.findFirst({ where: eq(treatments.id, treatmentId), columns: { name: true } }) : null,
    ]);

    const adminTo = process.env.INQUIRY_NOTIFY_EMAIL || "admin@medcasts.com";
    const adminHtml = `
      <h2>New Appointment Request [${appt.code}]</h2>
      <p><b>Patient:</b> ${patientName} (${patientPhone})</p>
      <p><b>Doctor:</b> ${doctor?.name || "—"}</p>
      <p><b>Hospital:</b> ${hospital?.name || "—"}</p>
      <p><b>Treatment:</b> ${treatment?.name || "—"}</p>
      <p><b>Preferred:</b> ${new Date(preferredDate).toUTCString()}</p>
      <p><b>Type:</b> ${consultationType || "in-person"}</p>
      <p><b>Notes:</b> ${notes || "—"}</p>
    `;
    Promise.all([
      sendEmail({ to: adminTo, subject: `New Appointment: ${appt.code}`, html: adminHtml }).catch((e) => console.error(e)),
      patientEmail
        ? sendEmail({ to: patientEmail, subject: `Appointment request received [${appt.code}]`, html: renderPatientConfirmation({ name: patientName, type: "appointment" }) }).catch((e) => console.error(e))
        : null,
    ]);

    logConsent({
      purpose: "appointment",
      identifier: patientEmail?.trim() || patientPhone.trim(),
      consentText: "I consent to be contacted about this appointment.",
      request,
    });

    broadcast("appointment.new", {
      id: appt.id,
      code: appt.code,
      patientName: patientName.trim(),
      doctorName: doctor?.name,
      hospitalName: hospital?.name,
      preferredDate: new Date(preferredDate).toISOString(),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, code: appt.code, id: appt.id }, { status: 201 });
  } catch (err) {
    console.error("Appointment error:", err);
    return NextResponse.json({ error: "Failed to book. Please try again." }, { status: 500 });
  }
}
