import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { specialties, hospitals, hospitalSpecialties, cities, countries, treatments } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { renderRss, siteUrl } from "@/lib/rss";

export const revalidate = 3600;
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const specialty = await db.query.specialties.findFirst({
    where: eq(specialties.slug, slug),
  });
  if (!specialty) return new NextResponse("Not found", { status: 404 });

  const base = siteUrl();
  const [hospitalRows, treatmentRows] = await Promise.all([
    db
      .select({
        name: hospitals.name,
        slug: hospitals.slug,
        description: hospitals.description,
        updatedAt: hospitals.updatedAt,
        cityName: cities.name,
        countryName: countries.name,
      })
      .from(hospitalSpecialties)
      .innerJoin(hospitals, eq(hospitals.id, hospitalSpecialties.hospitalId))
      .innerJoin(cities, eq(cities.id, hospitals.cityId))
      .innerJoin(countries, eq(countries.id, cities.countryId))
      .where(and(eq(hospitalSpecialties.specialtyId, specialty.id), eq(hospitals.isActive, true)))
      .orderBy(desc(hospitals.updatedAt))
      .limit(50)
      .catch(() => []),
    db
      .select({
        name: treatments.name,
        slug: treatments.slug,
        description: treatments.description,
        updatedAt: treatments.updatedAt,
      })
      .from(treatments)
      .where(and(eq(treatments.specialtyId, specialty.id), eq(treatments.isActive, true)))
      .orderBy(desc(treatments.updatedAt))
      .limit(50)
      .catch(() => []),
  ]);

  const items = [
    ...hospitalRows.map((h) => ({
      title: `${h.name} — ${h.cityName}, ${h.countryName}`,
      link: `${base}/en/hospital/${h.slug}/${specialty.slug}`,
      description: h.description ?? undefined,
      pubDate: h.updatedAt,
    })),
    ...treatmentRows.map((t) => ({
      title: t.name,
      link: `${base}/en/treatment/${t.slug}`,
      description: t.description ?? undefined,
      pubDate: t.updatedAt,
    })),
  ].sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));

  const body = renderRss({
    title: `${specialty.name} — MedCasts`,
    description: `Latest ${specialty.name.toLowerCase()} hospitals and treatments indexed on MedCasts.`,
    link: `${base}/en/specialty/${specialty.slug}`,
    self: `${base}/rss/specialty/${specialty.slug}`,
    items,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
