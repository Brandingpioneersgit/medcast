import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactInquiries } from "@/lib/db/schema";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { logConsent } from "@/lib/consent";
import { broadcast } from "@/lib/broadcast";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  email?: unknown;
  treatmentId?: unknown;
  treatmentSlug?: unknown;
  treatmentName?: unknown;
  countrySlug?: unknown;
  countryName?: unknown;
  currentPriceUsd?: unknown;
  targetPercent?: unknown;
  sourcePage?: unknown;
};

export async function POST(request: NextRequest) {
  const rl = rateLimit({
    key: `price-watch:${clientIp(request)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooMany(rl.reset);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const treatmentName = typeof body.treatmentName === "string" ? body.treatmentName.trim() : "";
  if (!treatmentName) {
    return NextResponse.json({ error: "Treatment required" }, { status: 400 });
  }

  const treatmentId =
    typeof body.treatmentId === "number" && Number.isFinite(body.treatmentId)
      ? body.treatmentId
      : null;
  const treatmentSlug = typeof body.treatmentSlug === "string" ? body.treatmentSlug : null;
  const countrySlug = typeof body.countrySlug === "string" ? body.countrySlug : null;
  const countryName = typeof body.countryName === "string" ? body.countryName : null;
  const currentPriceUsd =
    typeof body.currentPriceUsd === "number" && Number.isFinite(body.currentPriceUsd)
      ? body.currentPriceUsd
      : null;
  const targetPercent =
    typeof body.targetPercent === "number" && Number.isFinite(body.targetPercent)
      ? Math.max(1, Math.min(90, Math.round(body.targetPercent)))
      : 10;
  const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage : null;

  const meta = {
    type: "price_watch" as const,
    email,
    treatmentSlug,
    countrySlug,
    currentPriceUsd,
    targetPercent,
  };

  const message = [
    `Price watch requested.`,
    `Treatment: ${treatmentName}${treatmentSlug ? ` (${treatmentSlug})` : ""}`,
    countryName ? `Country: ${countryName}${countrySlug ? ` (${countrySlug})` : ""}` : null,
    currentPriceUsd ? `Current lowest quote: $${currentPriceUsd.toLocaleString()}` : null,
    `Notify threshold: -${targetPercent}%`,
    ``,
    `__meta: ${JSON.stringify(meta)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const inserted = await db
      .insert(contactInquiries)
      .values({
        name: email.split("@")[0],
        email,
        country: countryName,
        message,
        medicalConditionSummary: `Price watch: ${treatmentName}`,
        treatmentId: treatmentId ?? undefined,
        status: "price_watch",
        sourcePage: sourcePage ?? undefined,
        preferredContactMethod: "email",
        ipAddress: clientIp(request),
      })
      .returning({ id: contactInquiries.id });

    logConsent({
      purpose: "price_watch",
      identifier: email,
      consentText: `I consent to price-drop alerts for ${treatmentName}${countryName ? ` in ${countryName}` : ""}.`,
      sourcePage: sourcePage ?? null,
      request,
    });

    broadcast("price_watch.new", {
      id: inserted[0]?.id,
      email,
      treatmentName,
      countryName,
      targetPercent,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, id: inserted[0]?.id });
  } catch (err) {
    console.error("price-watch insert failed:", err);
    return NextResponse.json({ error: "Could not save watch" }, { status: 500 });
  }
}
