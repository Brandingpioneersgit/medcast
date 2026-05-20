import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitals, specialties } from "@/lib/db/schema";
import { DoctorForm } from "@/components/admin/doctor-form";

export default async function NewDoctorPage() {
  await requireAuth();

  const [hospitalList, specialtyList] = await Promise.all([
    db.select({ id: hospitals.id, name: hospitals.name }).from(hospitals),
    db.select({ id: specialties.id, name: specialties.name }).from(specialties),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Doctor</h1>
      <DoctorForm hospitals={hospitalList} specialties={specialtyList} />
    </div>
  );
}
