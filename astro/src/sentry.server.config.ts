import * as Sentry from "@sentry/astro";

/**
 * Server-side Sentry. PII-conscious config:
 * - tracesSampleRate dropped to 0.1 (was 1.0) — sampling at 100% in prod
 *   torches our quota and contains no signal we don't already get from logs.
 * - beforeSend strips known patient-data fields from event extra/contexts so
 *   inquiry messages, appointment notes, patient review bodies, etc. never
 *   leave the request boundary even when an exception is captured.
 */

const PII_KEYS = new Set([
  "message",        // inquiries.message
  "notes",          // appointments.notes
  "body",           // patient_reviews.body
  "review",
  "story",          // testimonials.story
  "email",
  "phone",
  "phone_number",
  "patient_name",
  "patient_country",
  "ip",
  "ipAddress",
  "ip_address",
  "address",
  "passport",
  "dob",
  "date_of_birth",
]);

function scrub<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (PII_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else {
      out[k] = scrub(v);
    }
  }
  return out as T;
}

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Don't auto-attach IPs / cookies / Authorization headers.
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      // Drop cookies + Authorization headers — these can leak session tokens.
      if (event.request.headers) {
        delete (event.request.headers as Record<string, unknown>)["cookie"];
        delete (event.request.headers as Record<string, unknown>)["authorization"];
      }
      delete event.request.cookies;
      // Scrub form data + JSON body for known PII fields.
      if (event.request.data) {
        event.request.data = scrub(event.request.data);
      }
    }
    if (event.extra) event.extra = scrub(event.extra);
    if (event.contexts) event.contexts = scrub(event.contexts);
    return event;
  },
});
