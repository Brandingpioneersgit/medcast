import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, hospitals, doctors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPortalSession } from "@/lib/auth/portal";
import { generateOpinionPDF } from "@/lib/pdf/documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.code, code.toUpperCase()),
  });
  if (!appt || appt.id !== session.appointmentId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [h, d] = await Promise.all([
    appt.hospitalId
      ? db.query.hospitals.findFirst({
          where: eq(hospitals.id, appt.hospitalId),
          columns: { name: true },
        })
      : null,
    appt.doctorId
      ? db.query.doctors.findFirst({
          where: eq(doctors.id, appt.doctorId),
          columns: { name: true, title: true },
        })
      : null,
  ]);

  const doc = generateOpinionPDF({
    patientName: appt.patientName,
    doctorName: d?.name ?? "TBD",
    doctorTitle: d?.title ?? "",
    hospitalName: h?.name ?? "TBD",
    treatmentName: "See coordinator",
    opinionText: appt.notes ?? "Your surgeon opinion will be uploaded shortly.",
    caseCode: appt.code,
    generatedAt: new Date(),
  });

  const buffer = doc.output("arraybuffer");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="surgeon-opinion-${code}.pdf"`,
    },
  });
}
