import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { treatments, specialties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TreatmentForm } from "@/components/admin/treatment-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditTreatmentPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;
  const treatment = await db.query.treatments.findFirst({ where: eq(treatments.id, Number(id)) });
  if (!treatment) notFound();
  const specialtyList = await db.select({ id: specialties.id, name: specialties.name }).from(specialties);
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit: {treatment.name}</h1>
      <TreatmentForm treatment={treatment} specialties={specialtyList} />
    </div>
  );
}
