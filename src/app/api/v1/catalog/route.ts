import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const [specialtyRows, treatmentRows] = await Promise.all([
      db.select({ id: s.specialties.id, slug: s.specialties.slug, name: s.specialties.name, sortOrder: s.specialties.sortOrder })
        .from(s.specialties)
        .where(eq(s.specialties.isActive, true))
        .orderBy(asc(s.specialties.sortOrder), asc(s.specialties.name)),
      db.select({ slug: s.treatments.slug, name: s.treatments.name, specialtyId: s.treatments.specialtyId })
        .from(s.treatments)
        .where(eq(s.treatments.isActive, true))
        .orderBy(asc(s.treatments.name)),
    ]);

    const byId = new Map<number, { slug: string; name: string; treatments: { slug: string; name: string }[] }>();
    for (const sp of specialtyRows) byId.set(sp.id, { slug: sp.slug, name: sp.name, treatments: [] });
    for (const t of treatmentRows) byId.get(t.specialtyId)?.treatments.push({ slug: t.slug, name: t.name });

    const groups = Array.from(byId.values()).filter((g) => g.treatments.length > 0);
    return NextResponse.json({ groups });
  } catch {
    return NextResponse.json({ groups: [] });
  }
}
