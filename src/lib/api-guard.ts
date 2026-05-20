import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

type Role = "super_admin" | "admin" | "coordinator";

const ROLE_RANK: Record<Role, number> = {
  super_admin: 3,
  admin: 2,
  coordinator: 1,
};

/**
 * Require a valid session. Optionally enforce a minimum role.
 * Returns { session } if authorized, otherwise returns the 401/403 Response
 * and the caller should `return res!`.
 */
export async function requireAdmin(minRole?: Role): Promise<
  { session: { id: number; email: string; role: string }; res: null } |
  { session: null; res: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { session: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (minRole && (ROLE_RANK[session.role as Role] ?? 0) < ROLE_RANK[minRole]) {
    return { session: null, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, res: null };
}
