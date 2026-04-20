import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitals, cities, countries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { HospitalForm } from "@/components/admin/hospital-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditHospitalPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const hospital = await db.query.hospitals.findFirst({
    where: eq(hospitals.id, Number(id)),
  });
  if (!hospital) notFound();

  const cityList = await db
    .select({ id: cities.id, name: cities.name, countryName: countries.name })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit: {hospital.name}</h1>
      <HospitalForm hospital={hospital} cities={cityList} />
    </div>
  );
}
