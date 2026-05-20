export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  distinctId?: string;
}

export function isAnalyticsEnabled() {
  return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export async function track(event: AnalyticsEvent) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: event.name,
        distinct_id: event.distinctId || "anonymous",
        properties: event.properties || {},
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {}
}
