import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cities, countries, hospitals } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { VendorForm } from "../form";

export default async function NewVendorPage() {
  await requireAuth();

  const [cityRows, hospitalRows] = await Promise.all([
    db
      .select({
        id: cities.id,
        name: cities.name,
        countryName: countries.name,
      })
      .from(cities)
      .innerJoin(countries, eq(countries.id, cities.countryId))
      .where(eq(countries.isDestination, true))
      .orderBy(asc(countries.name), asc(cities.name))
      .limit(2000),
    db
      .select({ id: hospitals.id, name: hospitals.name })
      .from(hospitals)
      .where(eq(hospitals.isActive, true))
      .orderBy(asc(hospitals.name))
      .limit(2000),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">New vendor</h1>
      <VendorForm cities={cityRows} hospitals={hospitalRows} />
    </div>
  );
}
