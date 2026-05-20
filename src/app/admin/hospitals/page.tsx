import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitals, cities, countries } from "@/lib/db/schema";
import { eq, desc, sql, count, and, or, ilike } from "drizzle-orm";
import { AdminPageHeader, StatRibbon, AdminPagination } from "@/components/admin";
import { BulkHospitalsTable } from "./bulk-table";
import { HospitalsFilterBar } from "./filter-bar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ q?: string; country?: string; status?: string; featured?: string; page?: string }>;
}

export default async function HospitalsAdminPage({ searchParams }: PageProps) {
  await requireAuth();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const countrySlug = sp.country ?? "";
  const status = sp.status ?? "";
  const featured = sp.featured ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // Build WHERE conditions shared by rows + count queries
  const conds = [];
  if (q) {
    conds.push(
      or(
        ilike(hospitals.name, `%${q}%`),
        ilike(hospitals.slug, `%${q}%`),
        ilike(cities.name, `%${q}%`),
      )!,
    );
  }
  if (countrySlug) conds.push(eq(countries.slug, countrySlug));
  if (status === "active") conds.push(eq(hospitals.isActive, true));
  if (status === "inactive") conds.push(eq(hospitals.isActive, false));
  if (featured === "1") conds.push(eq(hospitals.isFeatured, true));
  if (featured === "0") conds.push(eq(hospitals.isFeatured, false));

  const whereClause = conds.length > 0 ? and(...conds) : undefined;

  const [allHospitals, matchingCount, stats, countryOptions] = await Promise.all([
    db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        slug: hospitals.slug,
        rating: hospitals.rating,
        reviewCount: hospitals.reviewCount,
        bedCapacity: hospitals.bedCapacity,
        isActive: hospitals.isActive,
        isFeatured: hospitals.isFeatured,
        cityName: cities.name,
        countryName: countries.name,
      })
      .from(hospitals)
      .innerJoin(cities, eq(hospitals.cityId, cities.id))
      .innerJoin(countries, eq(cities.countryId, countries.id))
      .where(whereClause)
      .orderBy(desc(hospitals.isFeatured), desc(hospitals.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(hospitals)
      .innerJoin(cities, eq(hospitals.cityId, cities.id))
      .innerJoin(countries, eq(cities.countryId, countries.id))
      .where(whereClause)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${hospitals.isActive} = true)::int`,
        featured: sql<number>`COUNT(*) FILTER (WHERE ${hospitals.isFeatured} = true)::int`,
        thinDesc: sql<number>`COUNT(*) FILTER (WHERE ${hospitals.description} IS NULL OR length(${hospitals.description}) < 200)::int`,
      })
      .from(hospitals)
      .then((r) => r[0]),
    db
      .select({ slug: countries.slug, name: countries.name })
      .from(countries)
      .innerJoin(cities, eq(cities.countryId, countries.id))
      .innerJoin(hospitals, eq(hospitals.cityId, cities.id))
      .groupBy(countries.slug, countries.name)
      .orderBy(countries.name),
  ]);

  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader
        title="Hospitals"
        subtitle="Every hospital we list — accreditation, specialties, descriptions, and visibility on the public site."
        action={{ label: "Add hospital", href: "/admin/hospitals/new" }}
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "Active", value: stats.active.toLocaleString(), tone: "success" },
              { label: "Featured", value: stats.featured.toLocaleString() },
              { label: "Thin descriptions", value: stats.thinDesc.toLocaleString(), tone: stats.thinDesc > 0 ? "warn" : "success", sub: "<200 chars" },
            ]}
          />
        }
      />
      <HospitalsFilterBar
        countries={countryOptions}
        totalRows={stats.total}
        matchingRows={matchingCount}
      />
      <BulkHospitalsTable rows={allHospitals} />
      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalRows={matchingCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
