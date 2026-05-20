import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { contactInquiries } from "../../../../../src/lib/db/schema";
import { rateLimit, clientIp, requireSameOrigin } from "@/lib/rate-limit";

export const prerender = false;

type Body = {
  incidentType?: string;
  severity?: string;
  description?: string;
  occurredAt?: string | null;
  isAnonymous?: boolean;
  reporterEmail?: string | null;
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const rl = rateLimit({ key: `incidents:${clientAddress ?? clientIp(request)}`, limit: 5, windowMs: 60_000 });
  if (!rl.ok) return json({ error: "Too many requests" }, 429);

  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const description = (body.description ?? "").trim();
  if (description.length < 20) return json({ error: "Description too short" }, 400);
  if (description.length > 5000) return json({ error: "Description too long" }, 400);

  const incidentType = (body.incidentType ?? "other").trim().slice(0, 64);
  const severity = (body.severity ?? "moderate").trim().slice(0, 32);
  const occurredAt = body.occurredAt ? body.occurredAt.trim().slice(0, 32) : null;
  const isAnonymous = body.isAnonymous !== false;
  const reporterEmail = !isAnonymous && body.reporterEmail ? body.reporterEmail.trim().slice(0, 320) : null;

  const message = [
    `Incident type: ${incidentType}`,
    `Severity: ${severity}`,
    occurredAt ? `Occurred at: ${occurredAt}` : null,
    `Anonymous: ${isAnonymous ? "yes" : "no"}`,
    "",
    "Description:",
    description,
  ].filter(Boolean).join("\n");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || clientAddress || null;
  const ua = request.headers.get("user-agent") ?? "";

  await db.insert(contactInquiries).values({
    name: isAnonymous ? "Anonymous reporter" : "Incident reporter",
    email: reporterEmail,
    phone: "",
    whatsappNumber: null,
    country: null,
    medicalConditionSummary: `Incident: ${incidentType}`,
    message,
    preferredContactMethod: reporterEmail ? "email" : "none",
    status: "new",
    sourcePage: "/incident-report",
    utmSource: "incident-report",
    utmMedium: "form",
    utmCampaign: `incident-${severity}`,
    ipAddress: ip ?? undefined,
    userAgent: ua,
  });

  return json({ ok: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
