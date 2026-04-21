import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { contactInquiries, hospitals, treatments, doctors } from "../../../../../src/lib/db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  countryOfOrigin?: string;
  destinationCountry?: string;
  treatmentSlug?: string;
  hospitalSlug?: string;
  doctorSlug?: string;
  estimateMinUsd?: number;
  estimateMaxUsd?: number;
  timeline?: string;
  notes?: string;
  locale?: string;
  source?: string;
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const origin = (body.countryOfOrigin ?? "").trim();
  if (!name || name.length < 2) return json({ error: "Name required" }, 400);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return json({ error: "Valid phone required" }, 400);
  if (!origin) return json({ error: "Country of origin required" }, 400);

  const [treatmentRow] = body.treatmentSlug
    ? await db.select({ id: treatments.id, name: treatments.name }).from(treatments).where(eq(treatments.slug, body.treatmentSlug)).limit(1)
    : [null];
  const [hospitalRow] = body.hospitalSlug
    ? await db.select({ id: hospitals.id, name: hospitals.name }).from(hospitals).where(eq(hospitals.slug, body.hospitalSlug)).limit(1)
    : [null];
  const [doctorRow] = body.doctorSlug
    ? await db.select({ id: doctors.id, name: doctors.name, hospitalId: doctors.hospitalId }).from(doctors).where(eq(doctors.slug, body.doctorSlug)).limit(1)
    : [null];

  const summaryParts = [
    doctorRow ? `Preferred doctor: ${doctorRow.name}` : null,
    treatmentRow ? `Procedure: ${treatmentRow.name}` : null,
    hospitalRow ? `Preferred hospital: ${hospitalRow.name}` : null,
    body.destinationCountry ? `Destination: ${body.destinationCountry}` : null,
    body.estimateMinUsd || body.estimateMaxUsd
      ? `Calculator estimate: $${(body.estimateMinUsd ?? 0).toLocaleString()} – $${(body.estimateMaxUsd ?? 0).toLocaleString()}`
      : null,
    body.timeline ? `Timeline: ${body.timeline}` : null,
    body.notes ? `Notes: ${body.notes}` : null,
  ].filter(Boolean);

  const message = summaryParts.join("\n");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || clientAddress || null;
  const ua = request.headers.get("user-agent") ?? "";

  const [inserted] = await db
    .insert(contactInquiries)
    .values({
      name,
      email: body.email?.trim() || null,
      phone,
      whatsappNumber: phone,
      country: origin,
      medicalConditionSummary:
        treatmentRow?.name ??
        (doctorRow ? `Consult with ${doctorRow.name}` : "Quote request"),
      message,
      hospitalId: hospitalRow?.id ?? doctorRow?.hospitalId ?? null,
      treatmentId: treatmentRow?.id ?? null,
      doctorId: doctorRow?.id ?? null,
      preferredContactMethod: "whatsapp",
      preferredLanguage: body.locale ?? null,
      status: "new",
      sourcePage: body.source ?? (doctorRow ? `/doctor/${body.doctorSlug}` : "/calculator"),
      utmSource: body.source ? body.source.replace(/^\//, "").split("/")[0] : "calculator",
      utmMedium: "astro",
      utmCampaign: body.doctorSlug
        ? `doctor-${body.doctorSlug}`
        : body.treatmentSlug
          ? `calc-${body.treatmentSlug}-${body.destinationCountry ?? "any"}`
          : "calc",
      ipAddress: ip ?? undefined,
      userAgent: ua,
    })
    .returning({ id: contactInquiries.id });

  return json({ ok: true, id: inserted?.id ?? null });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
