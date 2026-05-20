import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "admin_session";
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";
if (process.env.NODE_ENV === "production" && SESSION_SECRET === "dev-secret") {
  throw new Error(
    "NEXTAUTH_SECRET is not set in production. Admin session tokens cannot be safely signed.",
  );
}

// HMAC-signed token: `<base64url(payload)>.<base64url(signature)>`.
// The previous version was base64-only — anyone could forge a session by
// encoding their own payload. Now the signature is verified before the
// payload is trusted.
function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function encodeToken(payload: { id: number; email: string; role: string }): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const body = Buffer.from(data).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeToken(token: string): { id: number; email: string; role: string; exp: number } | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot <= 0) return null;
    const body = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = sign(body);
    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expected, "base64url");
    // Constant-time compare to defeat sig-length / timing oracles.
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function authenticate(email: string, password: string) {
  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email),
  });

  if (!user || !user.isActive) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role || "admin" };
}

export async function createSession(user: { id: number; email: string; role: string }) {
  const token = encodeToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // strict — admin cookie should never accompany cross-site requests.
    // The admin UI lives only at /admin/* on this same origin.
    sameSite: "strict",
    maxAge: 86400,
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeToken(token);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
