import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries, hospitals, cities, doctors } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { renderRss, siteUrl } from "@/lib/rss";

export const revalidate = 3600;
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const country = await db.query.countries.findFirst({
    where: and(eq(countries.slug, slug), eq(countries.isDestination, true)),
  });
  if (!country) return new NextResponse("Not found", { status: 404 });

  const base = siteUrl();

  const [hospitalRows, doctorRows] = await Promise.all([
    db
      .select({
        name: hospitals.name,
        slug: hospitals.slug,
        description: hospitals.description,
        updatedAt: hospitals.updatedAt,
        cityName: cities.name,
      })
      .from(hospitals)
      .innerJoin(cities, eq(cities.id, hospitals.cityId))
      .where(and(eq(cities.countryId, country.id), eq(hospitals.isActive, true)))
      .orderBy(desc(hospitals.updatedAt))
      .limit(50)
      .catch(() => []),
    db
      .select({
        name: doctors.name,
        slug: doctors.slug,
        bio: doctors.bio,
        updatedAt: doctors.updatedAt,
        hospitalName: hospitals.name,
      })
      .from(doctors)
      .innerJoin(hospitals, eq(hospitals.id, doctors.hospitalId))
      .innerJoin(cities, eq(cities.id, hospitals.cityId))
      .where(and(eq(cities.countryId, country.id), eq(doctors.isActive, true)))
      .orderBy(desc(doctors.updatedAt))
      .limit(50)
      .catch(() => []),
  ]);

  const items = [
    ...hospitalRows.map((h) => ({
      title: `${h.name} — ${h.cityName}`,
      link: `${base}/en/hospital/${h.slug}`,
      description: h.description ?? undefined,
      pubDate: h.updatedAt,
    })),
    ...doctorRows.map((d) => ({
      title: `${d.name} at ${d.hospitalName}`,
      link: `${base}/en/doctor/${d.slug}`,
      description: d.bio ?? undefined,
      pubDate: d.updatedAt,
    })),
  ].sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));

  const body = renderRss({
    title: `Medical tourism in ${country.name} — MedCasts`,
    description: `Latest hospitals and specialists in ${country.name} indexed on MedCasts.`,
    link: `${base}/en/country/${country.slug}`,
    self: `${base}/rss/country/${country.slug}`,
    items,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
