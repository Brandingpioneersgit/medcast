import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cities, countries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { HospitalForm } from "@/components/admin/hospital-form";

export default async function NewHospitalPage() {
  await requireAuth();

  const cityList = await db
    .select({ id: cities.id, name: cities.name, countryName: countries.name })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Hospital</h1>
      <HospitalForm cities={cityList} />
    </div>
  );
}
