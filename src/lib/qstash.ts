import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const QSTASH_URL = process.env.QSTASH_URL || "https://qstash.upstash.io";
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const CURRENT_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const NEXT_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

export function isQStashConfigured() {
  return Boolean(QSTASH_TOKEN && CURRENT_KEY);
}

type PublishOptions = {
  url: string;
  body: unknown;
  /** e.g. "24h", "10s", "1d" — relative delay. */
  delay?: string;
  /** ISO timestamp for exact scheduling (takes precedence over delay). */
  notBefore?: Date;
  /** QStash deduplication id — retries within dedupe window return the original id. */
  deduplicationId?: string;
  /** Upstash retries — default 3. */
  retries?: number;
};

export async function publishJSON(opts: PublishOptions): Promise<{ messageId: string }> {
  if (!QSTASH_TOKEN) throw new Error("QSTASH_TOKEN not configured");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${QSTASH_TOKEN}`,
    "Content-Type": "application/json",
  };
  if (opts.delay) headers["Upstash-Delay"] = opts.delay;
  if (opts.notBefore) headers["Upstash-Not-Before"] = Math.floor(opts.notBefore.getTime() / 1000).toString();
  if (opts.deduplicationId) headers["Upstash-Deduplication-Id"] = opts.deduplicationId;
  if (opts.retries != null) headers["Upstash-Retries"] = String(opts.retries);

  const endpoint = `${QSTASH_URL}/v2/publish/${opts.url}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body),
  });
  if (!res.ok) {
    throw new Error(`QStash publish failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { messageId: string };
  return json;
}

export async function createSchedule(opts: {
  url: string;
  cron: string;
  body?: unknown;
  retries?: number;
}): Promise<{ scheduleId: string }> {
  if (!QSTASH_TOKEN) throw new Error("QSTASH_TOKEN not configured");
  const endpoint = `${QSTASH_URL}/v2/schedules/${opts.url}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${QSTASH_TOKEN}`,
    "Content-Type": "application/json",
    "Upstash-Cron": opts.cron,
  };
  if (opts.retries != null) headers["Upstash-Retries"] = String(opts.retries);

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : "{}",
  });
  if (!res.ok) throw new Error(`QStash schedule failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { scheduleId: string };
}

export async function listSchedules(): Promise<Array<{ scheduleId: string; destination: string; cron: string }>> {
  if (!QSTASH_TOKEN) return [];
  const res = await fetch(`${QSTASH_URL}/v2/schedules`, {
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  if (!res.ok) return [];
  return (await res.json()) as Array<{ scheduleId: string; destination: string; cron: string }>;
}

export async function deleteSchedule(id: string): Promise<void> {
  if (!QSTASH_TOKEN) return;
  await fetch(`${QSTASH_URL}/v2/schedules/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
}

// ----------------------------------------------------------------------------
// Signature verification — Upstash-Signature is a JWT signed with HS256.
// Payload claims: iss, sub (destination URL), exp, nbf, iat, jti, body (sha256 base64url).
// Accept either CURRENT or NEXT key for rotation grace.
// ----------------------------------------------------------------------------

function base64urlToBuffer(s: string): Buffer {
  const pad = 4 - (s.length % 4);
  const b64 = (s + (pad < 4 ? "=".repeat(pad) : "")).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function safeEqualBuf(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function verifyJWT(token: string, key: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const mac = createHmac("sha256", key).update(signingInput).digest();
  const given = base64urlToBuffer(sigB64!);
  if (!safeEqualBuf(mac, given)) return null;
  try {
    return JSON.parse(base64urlToBuffer(payloadB64!).toString("utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Verify an incoming QStash webhook request.
 * Reads the Upstash-Signature header and compares against CURRENT + NEXT keys.
 * Returns true if the signature is valid AND the body hash matches.
 */
export async function verifyQStashSignature(request: Request, rawBody: string): Promise<boolean> {
  if (!CURRENT_KEY) return false;
  const token = request.headers.get("upstash-signature") || request.headers.get("Upstash-Signature");
  if (!token) return false;

  const claims = verifyJWT(token, CURRENT_KEY) || (NEXT_KEY ? verifyJWT(token, NEXT_KEY) : null);
  if (!claims) return false;

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === "number" && claims.exp < now) return false;
  if (typeof claims.nbf === "number" && claims.nbf > now + 30) return false;

  const expectedBody = claims.body as string | undefined;
  if (expectedBody) {
    const actualHash = createHash("sha256").update(rawBody, "utf-8").digest();
    const expectedBuf = base64urlToBuffer(expectedBody);
    if (!safeEqualBuf(actualHash, expectedBuf)) return false;
  }

  return true;
}
