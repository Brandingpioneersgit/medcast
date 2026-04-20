import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitals, cities, countries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BulkHospitalsTable } from "./bulk-table";

export default async function HospitalsAdminPage() {
  await requireAuth();

  const allHospitals = await db
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
    .orderBy(desc(hospitals.createdAt))
    .limit(500);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hospitals</h1>
        <Link
          href="/admin/hospitals/new"
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" /> Add Hospital
        </Link>
      </div>

      <BulkHospitalsTable rows={allHospitals} />
    </div>
  );
}
