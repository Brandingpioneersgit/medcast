import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctors, doctorSpecialties, hospitals, specialties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader, NotesPanel, ArchiveButton } from "@/components/admin";
import { DoctorForm } from "@/components/admin/doctor-form";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditDoctorPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const doctor = await db.query.doctors.findFirst({ where: eq(doctors.id, Number(id)) });
  if (!doctor) notFound();

  const [hospitalList, specialtyList, links] = await Promise.all([
    db.select({ id: hospitals.id, name: hospitals.name }).from(hospitals),
    db.select({ id: specialties.id, name: specialties.name }).from(specialties),
    db
      .select({ specialtyId: doctorSpecialties.specialtyId })
      .from(doctorSpecialties)
      .where(eq(doctorSpecialties.doctorId, doctor.id)),
  ]);

  return (
    <div>
      <AdminPageHeader
        title={doctor.name}
        subtitle={`/doctor/${doctor.slug}`}
        breadcrumbs={[
          { label: "Doctors", href: "/admin/doctors" },
          { label: "Edit" },
        ]}
        actions={
          <>
            <Link
              href={`/doctor/${doctor.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View on site
            </Link>
            <ArchiveButton
              entityType="doctor"
              entityId={doctor.id}
              slug={doctor.slug}
              isArchived={!!doctor.archivedAt}
            />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr,360px] items-start">
        <DoctorForm
          doctor={doctor}
          hospitals={hospitalList}
          specialties={specialtyList}
          currentSpecialtyIds={links.map((l) => l.specialtyId)}
        />
        <aside className="lg:sticky lg:top-6">
          <NotesPanel entityType="doctor" entityId={doctor.id} />
        </aside>
      </div>
    </div>
  );
}
