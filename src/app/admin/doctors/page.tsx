import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctors, hospitals } from "@/lib/db/schema";
import { eq, desc, sql, count, and, or, ilike, asc } from "drizzle-orm";
import { AdminPageHeader, StatRibbon, AdminPagination } from "@/components/admin";
import { DoctorsTableClient } from "./table-client";
import { DoctorsFilterBar } from "./filter-bar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ q?: string; hospital?: string; status?: string; featured?: string; page?: string }>;
}

export default async function DoctorsAdminPage({ searchParams }: PageProps) {
  await requireAuth();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const hospitalIdRaw = parseInt(sp.hospital ?? "", 10);
  const hospitalId = Number.isFinite(hospitalIdRaw) && hospitalIdRaw > 0 ? hospitalIdRaw : null;
  const status = sp.status ?? "";
  const featured = sp.featured ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const conds = [];
  if (q) {
    conds.push(
      or(
        ilike(doctors.name, `%${q}%`),
        ilike(doctors.slug, `%${q}%`),
        ilike(doctors.qualifications, `%${q}%`),
      )!,
    );
  }
  if (hospitalId !== null) conds.push(eq(doctors.hospitalId, hospitalId));
  if (status === "active") conds.push(eq(doctors.isActive, true));
  if (status === "inactive") conds.push(eq(doctors.isActive, false));
  if (featured === "1") conds.push(eq(doctors.isFeatured, true));
  if (featured === "0") conds.push(eq(doctors.isFeatured, false));

  const whereClause = conds.length > 0 ? and(...conds) : undefined;

  const [allDoctors, matchingCount, stats, hospitalOptions] = await Promise.all([
    db
      .select({
        id: doctors.id,
        name: doctors.name,
        slug: doctors.slug,
        qualifications: doctors.qualifications,
        experienceYears: doctors.experienceYears,
        rating: doctors.rating,
        reviewCount: doctors.reviewCount,
        isActive: doctors.isActive,
        isFeatured: doctors.isFeatured,
        hospitalName: hospitals.name,
        hospitalId: doctors.hospitalId,
      })
      .from(doctors)
      .innerJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(whereClause)
      .orderBy(desc(doctors.isFeatured), desc(doctors.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(doctors)
      .innerJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(whereClause)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${doctors.isActive} = true)::int`,
        featured: sql<number>`COUNT(*) FILTER (WHERE ${doctors.isFeatured} = true)::int`,
        thinBio: sql<number>`COUNT(*) FILTER (WHERE ${doctors.bio} IS NULL OR length(${doctors.bio}) < 200)::int`,
      })
      .from(doctors)
      .then((r) => r[0]),
    db
      .select({ id: hospitals.id, name: hospitals.name })
      .from(hospitals)
      .innerJoin(doctors, eq(doctors.hospitalId, hospitals.id))
      .groupBy(hospitals.id, hospitals.name)
      .orderBy(asc(hospitals.name))
      .limit(200),
  ]);

  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader
        title="Doctors"
        subtitle="Surgeon and specialist roster — qualifications, hospital affiliations, ratings, and visibility."
        action={{ label: "Add doctor", href: "/admin/doctors/new" }}
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "Active", value: stats.active.toLocaleString(), tone: "success" },
              { label: "Featured", value: stats.featured.toLocaleString() },
              { label: "Thin bios", value: stats.thinBio.toLocaleString(), tone: stats.thinBio > 0 ? "warn" : "success", sub: "<200 chars" },
            ]}
          />
        }
      />
      <DoctorsFilterBar
        hospitals={hospitalOptions}
        totalRows={stats.total}
        matchingRows={matchingCount}
      />
      <DoctorsTableClient rows={allDoctors} />
      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalRows={matchingCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
