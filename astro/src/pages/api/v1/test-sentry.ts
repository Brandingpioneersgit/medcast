import type { APIRoute } from "astro";
import * as Sentry from "@sentry/astro";

export const GET: APIRoute = async () => {
  const eventId = Sentry.captureMessage("Sentry test — GET /api/v1/test-sentry", "info");

  return new Response(
    JSON.stringify({
      ok: true,
      message: "Test event sent to Sentry",
      eventId,
      sentryDsn: !!import.meta.env.SENTRY_DSN,
      cloudflare: !!import.meta.env.CF_PAGES,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {}

  const err = new Error("Sentry test — POST /api/v1/test-sentry");

  const eventId = Sentry.captureException(err, {
    extra: { body, timestamp: new Date().toISOString(), source: "test-sentry" },
  });

  return new Response(
    JSON.stringify({
      ok: true,
      message: "Exception sent to Sentry",
      eventId,
      body,
    }),
    { headers: { "Content-Type": "application/json" }, status: 200 },
  );
};
