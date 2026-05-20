import * as Sentry from "@sentry/astro";

/**
 * Client-side Sentry. Disables `sendDefaultPii` (was `true`) so we don't
 * auto-attach IPs and identifiers. Replays explicitly mask all text +
 * inputs + media so patient data in form fields never reaches Sentry —
 * this is required for the YMYL/PHI-adjacent data MedCasts handles.
 */
Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,
  integrations: [
    Sentry.replayIntegration({
      // Default in v8+ but set explicitly so a future SDK rev can't quietly flip it.
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      // Extra masking selectors — cover the form-field classes our islands use.
      mask: [
        "[data-mc-redact]",
        "input[type=email]",
        "input[type=tel]",
        "input[name=name]",
        "input[name=phone]",
        "input[name=email]",
        "input[name=countryOfOrigin]",
        "textarea",
      ],
      block: ["[data-mc-redact]"],
    }),
  ],
  // Strip search params from URLs in events — query strings on form submit
  // can carry email/phone in legacy GET handlers.
  beforeSend(event) {
    if (event.request?.url) {
      try {
        const u = new URL(event.request.url);
        u.search = "";
        event.request.url = u.toString();
      } catch {
        // ignore
      }
    }
    return event;
  },
});
