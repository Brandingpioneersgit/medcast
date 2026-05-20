import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { specialties } from "@/lib/db/schema";
import { TreatmentForm } from "@/components/admin/treatment-form";

export default async function NewTreatmentPage() {
  await requireAuth();
  const specialtyList = await db.select({ id: specialties.id, name: specialties.name }).from(specialties);
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Treatment</h1>
      <TreatmentForm specialties={specialtyList} />
    </div>
  );
}
