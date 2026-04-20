import { db } from "@/lib/db";
import { consentLog } from "@/lib/db/schema";
import type { NextRequest } from "next/server";

export const CONSENT_POLICY_VERSION = "2026-04-20";

export type ConsentPurpose =
  | "inquiry"
  | "appointment"
  | "review_submit"
  | "review_flag"
  | "price_watch"
  | "second_opinion"
  | "newsletter"
  | "referral_signup";

export type ConsentInput = {
  purpose: ConsentPurpose;
  identifier?: string | null;
  consentText?: string;
  locale?: string | null;
  sourcePage?: string | null;
  request?: NextRequest | Request;
};

function headerFrom(req: ConsentInput["request"], key: string): string | null {
  if (!req) return null;
  const h = (req as Request).headers;
  if (!h) return null;
  return h.get(key);
}

function clientIpFromRequest(req: ConsentInput["request"]): string | null {
  if (!req) return null;
  const xff = headerFrom(req, "x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = headerFrom(req, "x-real-ip");
  if (real) return real.trim();
  return null;
}

/**
 * Record a consent event. Best-effort — swallows errors so a missing
 * consent_log table (pre-migration) never blocks the primary write.
 */
export async function logConsent(input: ConsentInput): Promise<void> {
  const ua = headerFrom(input.request, "user-agent");
  const ip = clientIpFromRequest(input.request);

  try {
    await db.insert(consentLog).values({
      purpose: input.purpose,
      identifier: input.identifier ?? null,
      policyVersion: CONSENT_POLICY_VERSION,
      consentText: input.consentText ?? null,
      ipAddress: ip ?? null,
      userAgent: ua ?? null,
      locale: input.locale ?? null,
      sourcePage: input.sourcePage ?? null,
    });
  } catch (err) {
    console.warn("[consent] log failed (non-blocking):", err);
  }
}
