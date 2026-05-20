import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await requireAuth();
  const body = await request.json().catch(() => ({}));
  const fromPath = String(body.fromPath ?? "").trim();
  const toPath = String(body.toPath ?? "").trim();
  const statusCode = Number(body.statusCode ?? 301);
  const note = body.note ? String(body.note).trim().slice(0, 255) : null;

  if (!fromPath.startsWith("/") || fromPath.length > 500) {
    return NextResponse.json({ error: "From path must start with / and be ≤500 chars" }, { status: 400 });
  }
  if (!toPath.startsWith("/") || toPath.length > 500) {
    return NextResponse.json({ error: "To path must start with / and be ≤500 chars" }, { status: 400 });
  }
  if (fromPath === toPath) {
    return NextResponse.json({ error: "From and To must differ" }, { status: 400 });
  }
  if (![301, 302].includes(statusCode)) {
    return NextResponse.json({ error: "Status must be 301 or 302" }, { status: 400 });
  }

  // Normalise: strip trailing slash (except root) so the middleware's key lookup matches.
  const normalise = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

  try {
    const [row] = await db
      .insert(redirects)
      .values({
        fromPath: normalise(fromPath),
        toPath: normalise(toPath),
        statusCode,
        note,
      })
      .onConflictDoUpdate({
        target: redirects.fromPath,
        set: {
          toPath: normalise(toPath),
          statusCode,
          note,
          updatedAt: new Date(),
        },
      })
      .returning({ id: redirects.id });
    return NextResponse.json({ ok: true, id: row?.id ?? null });
  } catch (e) {
    return NextResponse.json({ error: "Could not save redirect" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await requireAuth();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(redirects).where(eq(redirects.id, id));
  return NextResponse.json({ ok: true });
}
