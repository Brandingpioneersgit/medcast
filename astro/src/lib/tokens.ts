// Astro-local token helpers — same HS256 algorithm as src/lib/tokens.ts.
// Duplicated here because the parent file reads only process.env, which is
// unreliable under Vite/Astro dev (env vars from .env.local arrive via
// import.meta.env). Reading from both sources keeps mint+verify symmetric
// across dev, build, and Cloudflare Worker runtime.
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

function readSecret(): string {
  const ime = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  return (
    process.env.NEXTAUTH_SECRET ??
    ime.NEXTAUTH_SECRET ??
    process.env.JOBS_TOKEN ??
    ime.JOBS_TOKEN ??
    "insecure-dev-secret"
  );
}

export function signToken(payload: Record<string, unknown>, ttlMs: number): string {
  const exp = Date.now() + ttlMs;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const sig = createHmac("sha256", readSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
): (T & { exp: number }) | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", readSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed as T & { exp: number };
  } catch {
    return null;
  }
}

export function randomCode(bytes = 8): string {
  return randomBytes(bytes).toString("base64url");
}
