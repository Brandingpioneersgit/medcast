import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const PORTAL_COOKIE = "portal_session";
const SESSION_SECRET = process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === "production" ? (() => { throw new Error("NEXTAUTH_SECRET env var is required in production") })() : "dev-only-unsafe");

function sign(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

function encodePortalToken(payload: { appointmentId: number; email: string }): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const encoded = Buffer.from(data).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodePortalToken(
  token: string
): { appointmentId: number; email: string; exp: number } | null {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expected = sign(encoded);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null;
    }
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getPortalSession(): Promise<{
  appointmentId: number;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return decodePortalToken(token);
}

export async function createPortalSession(appointmentId: number, email: string) {
  const token = encodePortalToken({ appointmentId, email });
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });
}

export async function destroyPortalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_COOKIE);
}
