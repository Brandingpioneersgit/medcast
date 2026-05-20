import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { hospitals, doctors, treatments, conditions, contactInquiries } from "@/lib/db/schema";
import { or, like, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { res } = await requireAdmin(); if (res) return res!;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json({ results: [] });

  const limit = 6;
  const likeQ = `%${q}%`;

  const [hospRows, docRows, treatRows, condRows, inqRows] = await Promise.all([
    db
      .select({ id: hospitals.id, name: hospitals.name, slug: hospitals.slug })
      .from(hospitals)
      .where(like(hospitals.name, likeQ))
      .limit(limit),
    db
      .select({ id: doctors.id, name: doctors.name, slug: doctors.slug })
      .from(doctors)
      .where(like(doctors.name, likeQ))
      .limit(limit),
    db
      .select({ id: treatments.id, name: treatments.name, slug: treatments.slug })
      .from(treatments)
      .where(like(treatments.name, likeQ))
      .limit(limit),
    db
      .select({ id: conditions.id, name: conditions.name, slug: conditions.slug })
      .from(conditions)
      .where(like(conditions.name, likeQ))
      .limit(limit),
    db
      .select({ id: contactInquiries.id, name: contactInquiries.name, email: contactInquiries.email })
      .from(contactInquiries)
      .where(or(like(contactInquiries.name, likeQ), like(contactInquiries.email, likeQ)))
      .limit(limit),
  ]);

  const results = [
    ...hospRows.map(r => ({ id: r.id, type: "hospital" as const, label: r.name, sub: `/${r.slug}`, href: `/admin/hospitals/${r.id}/edit` })),
    ...docRows.map(r => ({ id: r.id, type: "doctor" as const, label: r.name, sub: `/${r.slug}`, href: `/admin/doctors/${r.id}/edit` })),
    ...treatRows.map(r => ({ id: r.id, type: "treatment" as const, label: r.name, sub: `/${r.slug}`, href: `/admin/treatments/${r.id}/edit` })),
    ...condRows.map(r => ({ id: r.id, type: "condition" as const, label: r.name, sub: `/${r.slug}`, href: `/admin/conditions` })),
    ...inqRows.map(r => ({ id: r.id, type: "inquiry" as const, label: r.name, sub: r.email, href: `/admin/inquiries` })),
  ];

  return NextResponse.json({ results });
}