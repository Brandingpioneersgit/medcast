import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, hospitals, treatments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPortalSession } from "@/lib/auth/portal";
import { generateVisaPDF } from "@/lib/pdf/documents";

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

  const [h, t] = await Promise.all([
    appt.hospitalId
      ? db.query.hospitals.findFirst({
          where: eq(hospitals.id, appt.hospitalId),
          columns: { name: true },
        })
      : null,
    appt.treatmentId
      ? db.query.treatments.findFirst({
          where: eq(treatments.id, appt.treatmentId),
          columns: { name: true },
        })
      : null,
  ]);

  const doc = generateVisaPDF({
    patientName: appt.patientName,
    patientCountry: appt.patientCountry ?? "",
    hospitalName: h?.name ?? "TBD",
    treatmentName: t?.name ?? "Medical treatment",
    caseCode: appt.code,
    generatedAt: new Date(),
  });

  const buffer = doc.output("arraybuffer");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="visa-letter-${code}.pdf"`,
    },
  });
}
