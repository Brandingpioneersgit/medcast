import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { contactInquiries, hospitals, treatments, doctors } from "../../../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, clientIp, requireSameOrigin } from "@/lib/rate-limit";

export const prerender = false;

type Fields = Record<string, string>;

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

async function readBody(request: Request): Promise<Fields> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const j = (await request.json()) as Record<string, unknown>;
      const out: Fields = {};
      for (const [k, v] of Object.entries(j)) {
        if (typeof v === "string" || typeof v === "number") out[k] = String(v);
      }
      return out;
    } catch {
      return {};
    }
  }
  // form-urlencoded or multipart
  const fd = await request.formData();
  const out: Fields = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/**
 * Maps `?type=` / `?topic=` from the contact CTA to the inquiry's
 * `medicalConditionSummary` + UTM campaign, so leads come in tagged with intent.
 */
const INTENT_LABELS: Record<string, string> = {
  "second-opinion": "Free second opinion request",
  quote: "Free quote request",
  partnership: "Hospital partnership inquiry",
  insurance: "Insurance & coverage question",
  referral: "Patient referral",
  visa: "Visa & travel coordination",
  travel: "Travel logistics support",
  "portal-help": "Patient portal help",
  "code-recovery": "Lost tracking code recovery",
  explain: "Glossary / clinical-term help",
  "specialist-match": "Specialist match request",
};

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const rl = rateLimit({
    key: `inquiry:${clientAddress ?? clientIp(request)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) return json({ error: "Too many requests" }, 429);

  const body = await readBody(request);

  const name = clean(body.name);
  const phone = clean(body.phone);
  const email = clean(body.email);
  const country = clean(body.country) || clean(body.countryCode);
  const message = clean(body.message);
  const treatmentInput = clean(body.treatment);
  const condition = clean(body.condition);
  // Patient-referral forms also carry the referrer's own contact details.
  const referrerName = clean(body.referrerName);
  const referrerRole = clean(body.referrerRole);
  const referrerEmail = clean(body.referrerEmail);
  const intentType = clean(body.type);
  const intentTopic = clean(body.topic);
  const intent = intentType || intentTopic;

  if (!name || name.length < 2) return json({ error: "Name required" }, 400);
  if (!email && !phone) return json({ error: "Email or phone required" }, 400);
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return json({ error: "Valid phone required" }, 400);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Valid email required" }, 400);
  }

  // Resolve optional FK references by slug
  const treatmentSlug = clean(body.treatmentSlug) || treatmentInput || null;
  const hospitalSlug = clean(body.hospitalSlug) || clean(body.hospital) || null;
  const doctorSlug = clean(body.doctorSlug) || clean(body.doctor) || null;

  const [treatmentRow] = treatmentSlug
    ? await db.select({ id: treatments.id, name: treatments.name }).from(treatments).where(eq(treatments.slug, treatmentSlug)).limit(1).catch(() => [])
    : [];
  const [hospitalRow] = hospitalSlug
    ? await db.select({ id: hospitals.id, name: hospitals.name }).from(hospitals).where(eq(hospitals.slug, hospitalSlug)).limit(1).catch(() => [])
    : [];
  const [doctorRow] = doctorSlug
    ? await db.select({ id: doctors.id, name: doctors.name, hospitalId: doctors.hospitalId }).from(doctors).where(eq(doctors.slug, doctorSlug)).limit(1).catch(() => [])
    : [];

  const intentLabel = intent ? INTENT_LABELS[intent] ?? intent : null;
  const summary =
    intentLabel ??
    treatmentRow?.name ??
    treatmentInput ??
    condition ??
    (doctorRow ? `Consult with ${doctorRow.name}` : "Inquiry");

  // Compose message body — prepend intent label so coordinators see it first.
  const messageParts: string[] = [];
  if (intentLabel) messageParts.push(`Intent: ${intentLabel}`);
  if (referrerName || referrerEmail) {
    const rRole = referrerRole ? ` (${referrerRole})` : "";
    const rMail = referrerEmail ? ` — ${referrerEmail}` : "";
    messageParts.push(`Referred by: ${referrerName || "Unnamed referrer"}${rRole}${rMail}`);
  }
  if (clean(body.code)) messageParts.push(`Tracking code: ${clean(body.code)}`);
  if (clean(body.specialty)) messageParts.push(`Specialty: ${clean(body.specialty)}`);
  if (clean(body.city)) messageParts.push(`City: ${clean(body.city)}`);
  if (clean(body.country)) messageParts.push(`Destination: ${clean(body.country)}`);
  if (treatmentInput && !treatmentRow) messageParts.push(`Treatment input: ${treatmentInput}`);
  if (condition) messageParts.push(`Condition: ${condition}`);
  if (clean(body.budget)) messageParts.push(`Budget: ${clean(body.budget)}`);
  if (clean(body.language)) messageParts.push(`Preferred language: ${clean(body.language)}`);
  if (clean(body.surgeon)) messageParts.push(`Preferred surgeon: ${clean(body.surgeon)}`);
  if (clean(body.dates)) messageParts.push(`Preferred dates: ${clean(body.dates)}`);
  if (message) messageParts.push(message);
  const fullMessage = messageParts.join("\n");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || clientAddress || null;
  const ua = request.headers.get("user-agent") ?? "";

  let insertedId: number | null = null;
  try {
    const [inserted] = await db
      .insert(contactInquiries)
      .values({
        name,
        email: email || null,
        phone: phone || "",
        whatsappNumber: phone || null,
        country: country || "Unknown",
        medicalConditionSummary: summary,
        message: fullMessage || null,
        hospitalId: hospitalRow?.id ?? doctorRow?.hospitalId ?? null,
        treatmentId: treatmentRow?.id ?? null,
        doctorId: doctorRow?.id ?? null,
        preferredContactMethod: phone ? "whatsapp" : "email",
        preferredLanguage: clean(body.locale) || null,
        status: "new",
        sourcePage: clean(body.source) || `/contact${intent ? `?intent=${intent}` : ""}`,
        utmSource: "contact-form",
        utmMedium: intent ? "intent" : "direct",
        utmCampaign: intent || "general",
        ipAddress: ip ?? undefined,
        userAgent: ua,
      })
      .returning({ id: contactInquiries.id });
    insertedId = inserted?.id ?? null;
  } catch (err) {
    console.error("[inquiry] insert failed:", err);
    return json({ error: "Could not save inquiry" }, 500);
  }

  // For form submissions (no JSON Accept), redirect back to a thank-you state.
  // For JSON callers, return the id.
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return json({ ok: true, id: insertedId });
  }
  const referer = request.headers.get("referer") ?? "/en/contact";
  const back = new URL(referer, request.url);
  back.searchParams.set("sent", "1");
  if (intent) back.searchParams.set("intent", intent);
  return redirect(back.pathname + (back.search || ""), 303);
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
