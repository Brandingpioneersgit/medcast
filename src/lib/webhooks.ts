import crypto from "node:crypto";
import { db } from "@/lib/db";
import { webhookSubscriptions, webhookDeliveries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { subscribe, type BroadcastEvent } from "@/lib/broadcast";

type Subscription = typeof webhookSubscriptions.$inferSelect;

function parseEvents(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  if (raw.trim() === "*") return new Set(["*"]);
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
  );
}

function matches(sub: Subscription, event: BroadcastEvent): boolean {
  const events = parseEvents(sub.events);
  if (events.has("*")) return true;
  return events.has(event);
}

async function listActiveSubs(): Promise<Subscription[]> {
  try {
    return await db
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.enabled, true));
  } catch {
    return [];
  }
}

function sign(secret: string, payload: string, timestamp: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

async function deliver(sub: Subscription, event: BroadcastEvent, data: unknown): Promise<void> {
  const payloadObj = { event, data, sentAt: new Date().toISOString() };
  const payload = JSON.stringify(payloadObj);
  const timestamp = String(Math.floor(Date.now() / 1000));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "MedCasts-Webhook/1.0",
    "X-MedCasts-Event": event,
    "X-MedCasts-Timestamp": timestamp,
    "X-MedCasts-Delivery": crypto.randomUUID(),
  };
  if (sub.secret) {
    headers["X-MedCasts-Signature"] = `sha256=${sign(sub.secret, payload, timestamp)}`;
  }

  let status = 0;
  let body = "";
  let ok = false;
  let error: string | null = null;

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8_000);
    const res = await fetch(sub.url, {
      method: "POST",
      headers,
      body: payload,
      signal: ac.signal,
    });
    clearTimeout(timer);
    status = res.status;
    body = (await res.text()).slice(0, 2000);
    ok = res.ok;
  } catch (err) {
    error = String(err).slice(0, 500);
  }

  try {
    await db.insert(webhookDeliveries).values({
      subscriptionId: sub.id,
      event,
      payload,
      responseStatus: status || null,
      responseBody: body || null,
      succeeded: ok,
      error,
    });
  } catch (err) {
    console.warn("[webhook] failed to record delivery:", err);
  }
}

let started = false;

export function startWebhookDispatcher(): void {
  if (started) return;
  started = true;

  subscribe("all", async (event, data) => {
    const subs = await listActiveSubs();
    if (subs.length === 0) return;
    await Promise.all(
      subs
        .filter((s) => matches(s, event))
        .map((s) => deliver(s, event, data).catch((e) => console.warn("[webhook] deliver failed:", e)))
    );
  });
}

export async function sendTestWebhook(subId: number): Promise<{ ok: boolean; status: number; body: string; error?: string }> {
  const sub = await db.query.webhookSubscriptions.findFirst({
    where: and(eq(webhookSubscriptions.id, subId), eq(webhookSubscriptions.enabled, true)),
  });
  if (!sub) return { ok: false, status: 0, body: "", error: "Subscription not found or disabled" };

  const payload = JSON.stringify({
    event: "webhook.test",
    data: { message: "This is a test delivery from MedCasts admin" },
    sentAt: new Date().toISOString(),
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "MedCasts-Webhook/1.0",
    "X-MedCasts-Event": "webhook.test",
    "X-MedCasts-Timestamp": timestamp,
  };
  if (sub.secret) {
    headers["X-MedCasts-Signature"] = `sha256=${sign(sub.secret, payload, timestamp)}`;
  }

  try {
    const res = await fetch(sub.url, {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(8_000),
    });
    const body = (await res.text()).slice(0, 2000);
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: "", error: String(err) };
  }
}
