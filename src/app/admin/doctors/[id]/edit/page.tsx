import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctors, doctorSpecialties, hospitals, specialties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DoctorForm } from "@/components/admin/doctor-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDoctorPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const doctor = await db.query.doctors.findFirst({ where: eq(doctors.id, Number(id)) });
  if (!doctor) notFound();

  const [hospitalList, specialtyList, links] = await Promise.all([
    db.select({ id: hospitals.id, name: hospitals.name }).from(hospitals),
    db.select({ id: specialties.id, name: specialties.name }).from(specialties),
    db.select({ specialtyId: doctorSpecialties.specialtyId }).from(doctorSpecialties).where(eq(doctorSpecialties.doctorId, doctor.id)),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit: {doctor.name}</h1>
      <DoctorForm
        doctor={doctor}
        hospitals={hospitalList}
        specialties={specialtyList}
        currentSpecialtyIds={links.map((l) => l.specialtyId)}
      />
    </div>
  );
}
