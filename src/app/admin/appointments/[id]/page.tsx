import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { AppointmentDetailClient } from "./client";

interface Props { params: Promise<{ id: string }> }

export default async function AppointmentDetailPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) redirect("/admin/appointments");

  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.id, numId),
  });
  if (!appt) notFound();

  return (
    <AppointmentDetailClient
      appointment={{
        id: appt.id,
        code: appt.code,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        patientEmail: appt.patientEmail,
        patientCountry: appt.patientCountry,
        preferredDate: appt.preferredDate.toISOString(),
        confirmedDate: appt.confirmedDate ? appt.confirmedDate.toISOString() : null,
        consultationType: appt.consultationType,
        status: appt.status,
        notes: appt.notes,
        assignedTo: appt.assignedTo,
      }}
    />
  );
}
