import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { isVendorKind } from "@/lib/vendor-kinds";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

function parsePrice(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!isVendorKind(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!name || !slug) return NextResponse.json({ error: "name + slug required" }, { status: 400 });

  try {
    const [row] = await db
      .insert(vendors)
      .values({
        kind,
        name,
        slug,
        cityId: body.cityId ? Number(body.cityId) : null,
        hospitalId: body.hospitalId ? Number(body.hospitalId) : null,
        description: typeof body.description === "string" ? body.description : null,
        contactName: typeof body.contactName === "string" ? body.contactName : null,
        phone: typeof body.phone === "string" ? body.phone : null,
        whatsapp: typeof body.whatsapp === "string" ? body.whatsapp : null,
        email: typeof body.email === "string" ? body.email : null,
        website: typeof body.website === "string" ? body.website : null,
        languages: typeof body.languages === "string" ? body.languages : null,
        priceFromUsd: parsePrice(body.priceFromUsd),
        priceToUsd: parsePrice(body.priceToUsd),
        priceUnit: typeof body.priceUnit === "string" ? body.priceUnit : null,
        rating: parsePrice(body.rating),
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
        isActive: body.isActive !== false,
        isFeatured: body.isFeatured === true,
      })
      .returning({ id: vendors.id });

    await recordAudit({
      actor: session.email,
      action: "vendor.create",
      entityType: "vendor",
      entityId: row.id,
      request,
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("vendor create failed:", err);
    return NextResponse.json({ error: "Insert failed (slug may be taken)" }, { status: 500 });
  }
}
