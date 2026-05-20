import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { appointments, doctors, hospitals, treatments } from "../../../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, clientIp, requireSameOrigin, isHoneypotTripped } from "@/lib/rate-limit";

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
  const fd = await request.formData();
  const out: Fields = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

// APT-XXXXXXXX — 8 chars upper-case base36. Matches the existing portal-lookup
// regex in src/components/shared/portal-lookup.tsx so patient codes are
// interchangeable across the Next.js portal and Astro confirmation page.
function genCode(): string {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `APT-${a}${b}`;
}

const CONSULT_TYPES = new Set(["in-person", "video", "phone"]);

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const rl = rateLimit({
    key: `appt:${clientAddress ?? clientIp(request)}`,
    limit: 6,
    windowMs: 60_000,
  });
  if (!rl.ok) return json({ error: "Too many requests" }, 429);

  const body = await readBody(request);

  // Silently accept honeypot trips so bots don't learn we caught them.
  if (isHoneypotTripped(body as unknown as Record<string, unknown>)) {
    return json({ ok: true, code: "APT-IGNORED" });
  }

  const name = clean(body.patientName) || clean(body.name);
  const email = clean(body.patientEmail) || clean(body.email);
  const phone = clean(body.patientPhone) || clean(body.phone);
  const country = clean(body.patientCountry) || clean(body.country);
  const preferredRaw = clean(body.preferredDate);
  const altRaw = clean(body.alternativeDate);
  const consultRaw = clean(body.consultationType) || "in-person";
  const notes = clean(body.notes);

  if (!name || name.length < 2) return json({ error: "Name required" }, 400);
  if (!phone) return json({ error: "Phone required" }, 400);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return json({ error: "Valid phone required" }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Valid email required" }, 400);
  }
  if (!preferredRaw) return json({ error: "Preferred date required" }, 400);

  const preferred = new Date(preferredRaw);
  if (Number.isNaN(preferred.getTime())) return json({ error: "Invalid preferred date" }, 400);
  // Reject obvious past dates (more than 1 day in the past — patient timezones
  // can legitimately land on "today" even if the server sees yesterday).
  if (preferred.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    return json({ error: "Preferred date must be in the future" }, 400);
  }

  let alternative: Date | null = null;
  if (altRaw) {
    const a = new Date(altRaw);
    if (!Number.isNaN(a.getTime())) alternative = a;
  }

  const consultationType = CONSULT_TYPES.has(consultRaw) ? consultRaw : "in-person";

  // Resolve target entities by slug — at least one of doctor/hospital/treatment
  // is expected, but bookings can also be open-ended ("anyone for cardiac").
  const doctorSlug = clean(body.doctorSlug) || clean(body.doctor);
  const hospitalSlug = clean(body.hospitalSlug) || clean(body.hospital);
  const treatmentSlug = clean(body.treatmentSlug) || clean(body.treatment);

  const [doctorRow] = doctorSlug
    ? await db
        .select({ id: doctors.id, name: doctors.name, hospitalId: doctors.hospitalId })
        .from(doctors)
        .where(eq(doctors.slug, doctorSlug))
        .limit(1)
        .catch(() => [])
    : [];
  const [hospitalRow] = hospitalSlug
    ? await db
        .select({ id: hospitals.id, name: hospitals.name })
        .from(hospitals)
        .where(eq(hospitals.slug, hospitalSlug))
        .limit(1)
        .catch(() => [])
    : [];
  const [treatmentRow] = treatmentSlug
    ? await db
        .select({ id: treatments.id, name: treatments.name })
        .from(treatments)
        .where(eq(treatments.slug, treatmentSlug))
        .limit(1)
        .catch(() => [])
    : [];

  // Try up to 3 times to dodge an unlikely code collision.
  let code = genCode();
  let insertedId: number | null = null;
  let attempts = 0;
  while (attempts < 3) {
    try {
      const [row] = await db
        .insert(appointments)
        .values({
          code,
          doctorId: doctorRow?.id ?? null,
          hospitalId: hospitalRow?.id ?? doctorRow?.hospitalId ?? null,
          treatmentId: treatmentRow?.id ?? null,
          patientName: name,
          patientEmail: email || null,
          patientPhone: phone,
          patientCountry: country || null,
          preferredDate: preferred,
          alternativeDate: alternative,
          consultationType,
          notes: notes || null,
          status: "requested",
        })
        .returning({ id: appointments.id, code: appointments.code });
      insertedId = row?.id ?? null;
      code = row?.code ?? code;
      break;
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      // Unique-violation on `code` — regenerate and retry.
      if (msg.includes("appointments_code_unique") || msg.includes("duplicate key")) {
        code = genCode();
        attempts += 1;
        continue;
      }
      console.error("[appointment] insert failed:", err);
      return json({ error: "Could not save appointment" }, 500);
    }
  }

  if (insertedId == null) {
    return json({ error: "Could not save appointment" }, 500);
  }

  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return json({ ok: true, id: insertedId, code }, 201);
  }

  // Form submissions: redirect to confirmation page. Locale comes from
  // referer when present, defaulting to /en.
  const referer = request.headers.get("referer") ?? "";
  let locale = "en";
  const match = referer.match(/\/(en|fr|de|es|ar|tr|pt|zh)(?:\/|$)/);
  if (match) locale = match[1]!;
  return redirect(`/${locale}/book/confirmed?code=${encodeURIComponent(code)}`, 303);
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
