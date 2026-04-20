import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "admin_session";
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

// Simple JWT-like token using base64 (production: use proper JWT)
function encodeToken(payload: { id: number; email: string; role: string }): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 });
  return Buffer.from(data).toString("base64url");
}

function decodeToken(token: string): { id: number; email: string; role: string; exp: number } | null {
  try {
    const data = JSON.parse(Buffer.from(token, "base64url").toString());
    if (data.exp < Date.now()) return null;
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
    sameSite: "lax",
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
