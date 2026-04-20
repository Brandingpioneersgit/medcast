import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";
import { recordSnapshot } from "@/lib/revisions";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { session: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { session, res: null };
}

export async function POST(request: NextRequest) {
  const { session, res } = await requireAdmin();
  if (res || !session) return res!;

  const data = await request.json();

  const [hospital] = await db.insert(hospitals).values({
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    website: data.website || null,
    cityId: data.cityId,
    establishedYear: data.establishedYear || null,
    bedCapacity: data.bedCapacity || null,
    rating: data.rating || "0",
    reviewCount: data.reviewCount || 0,
    airportDistanceKm: data.airportDistanceKm || null,
    isActive: data.isActive ?? true,
    isFeatured: data.isFeatured ?? false,
  }).returning();

  await recordAudit({
    actor: session.email,
    action: "hospital.create",
    entityType: "hospital",
    entityId: hospital.id,
    diff: JSON.stringify({ created: { name: hospital.name, slug: hospital.slug } }),
    request,
  });
  await recordSnapshot({
    entityType: "hospital",
    entityId: hospital.id,
    snapshot: hospital,
    changedBy: session.email,
    changeSummary: "Initial create",
  });

  return NextResponse.json({ success: true, hospital }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { session, res } = await requireAdmin();
  if (res || !session) return res!;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data = await request.json();

  const before = await db.query.hospitals.findFirst({ where: eq(hospitals.id, id) });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [hospital] = await db.update(hospitals)
    .set({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      cityId: data.cityId,
      establishedYear: data.establishedYear || null,
      bedCapacity: data.bedCapacity || null,
      rating: data.rating || "0",
      reviewCount: data.reviewCount || 0,
      airportDistanceKm: data.airportDistanceKm || null,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      updatedAt: new Date(),
    })
    .where(eq(hospitals.id, id))
    .returning();

  await recordSnapshot({
    entityType: "hospital",
    entityId: id,
    snapshot: before,
    changedBy: session.email,
    changeSummary: "Pre-edit snapshot",
  });

  const changedKeys = Object.keys(data).filter(
    (k) => JSON.stringify((before as Record<string, unknown>)[k]) !== JSON.stringify(data[k])
  );
  await recordAudit({
    actor: session.email,
    action: "hospital.update",
    entityType: "hospital",
    entityId: id,
    diff: JSON.stringify({ changed: changedKeys }),
    request,
  });

  return NextResponse.json({ success: true, hospital });
}

export async function DELETE(request: NextRequest) {
  const { session, res } = await requireAdmin();
  if (res || !session) return res!;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.update(hospitals).set({ isActive: false }).where(eq(hospitals.id, id));

  await recordAudit({
    actor: session.email,
    action: "hospital.deactivate",
    entityType: "hospital",
    entityId: id,
    request,
  });

  return NextResponse.json({ success: true });
}
