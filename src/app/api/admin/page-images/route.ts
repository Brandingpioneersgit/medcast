import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageImages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

const PAGE_TYPES = new Set([
  "hospital",
  "doctor",
  "country",
  "city",
  "specialty",
  "condition",
  "treatment",
  "blog",
  "static",
]);

const SLOTS = new Set([
  "cover",
  "hero",
  "banner",
  "og",
  "gallery-1",
  "gallery-2",
  "gallery-3",
  "gallery-4",
]);

function normalizeKey(key: string) {
  const t = key.trim();
  if (!t) return "";
  // Static-page keys must start with /, all others are bare slugs.
  return t;
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const body = await request.json().catch(() => ({}));
  const pageType = String(body.pageType ?? "").trim().toLowerCase();
  const pageKey = normalizeKey(String(body.pageKey ?? ""));
  const slot = String(body.slot ?? "cover").trim().toLowerCase();
  const url = String(body.url ?? "").trim();
  const altText = body.altText ? String(body.altText).trim().slice(0, 255) : null;
  const note = body.note ? String(body.note).trim().slice(0, 1000) : null;

  if (!PAGE_TYPES.has(pageType)) {
    return NextResponse.json({ error: `Page type must be one of: ${[...PAGE_TYPES].join(", ")}` }, { status: 400 });
  }
  if (!pageKey || pageKey.length > 220) {
    return NextResponse.json({ error: "Page key required (≤220 chars)" }, { status: 400 });
  }
  if (pageType === "static" && !pageKey.startsWith("/")) {
    return NextResponse.json({ error: "Static page key must start with /" }, { status: 400 });
  }
  if (pageType !== "static" && pageKey.startsWith("/")) {
    return NextResponse.json({ error: "Slug-based key shouldn't start with / — pass the bare slug" }, { status: 400 });
  }
  if (!SLOTS.has(slot)) {
    return NextResponse.json({ error: `Slot must be one of: ${[...SLOTS].join(", ")}` }, { status: 400 });
  }
  if (!/^https?:\/\//.test(url) && !url.startsWith("/")) {
    return NextResponse.json({ error: "URL must start with http(s):// or /" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(pageImages)
      .values({
        pageType,
        pageKey,
        slot,
        url,
        altText,
        note,
        updatedBy: session.email,
      })
      .onConflictDoUpdate({
        target: [pageImages.pageType, pageImages.pageKey, pageImages.slot],
        set: {
          url,
          altText,
          note,
          updatedBy: session.email,
          updatedAt: new Date(),
        },
      })
      .returning({ id: pageImages.id });
    return NextResponse.json({ ok: true, id: row?.id ?? null });
  } catch (e) {
    return NextResponse.json({ error: "Could not save image override" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await requireAuth();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(pageImages).where(eq(pageImages.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const session = await requireAuth();
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const url = body.url ? String(body.url).trim() : null;
  const altText = body.altText !== undefined ? (body.altText ? String(body.altText).slice(0, 255) : null) : undefined;
  const note = body.note !== undefined ? (body.note ? String(body.note).slice(0, 1000) : null) : undefined;

  if (url !== null && !/^https?:\/\//.test(url) && !url.startsWith("/")) {
    return NextResponse.json({ error: "URL must start with http(s):// or /" }, { status: 400 });
  }

  const set: Record<string, unknown> = { updatedBy: session.email, updatedAt: new Date() };
  if (url) set.url = url;
  if (altText !== undefined) set.altText = altText;
  if (note !== undefined) set.note = note;

  await db.update(pageImages).set(set).where(eq(pageImages.id, id));
  return NextResponse.json({ ok: true });
}
