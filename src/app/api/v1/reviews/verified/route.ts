import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientReviews, appointments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, reviewerName, reviewerEmail, rating, title, body: reviewBody, treatmentDate } = body;

    if (!rating || !reviewBody) {
      return NextResponse.json({ error: "rating and body required" }, { status: 400 });
    }

    let verifiedAppointmentId: number | null = null;
    if (appointmentId) {
      const appt = await db.query.appointments.findFirst({
        where: eq(appointments.id, parseInt(appointmentId)),
      });
      if (appt && appt.status === "completed") {
        verifiedAppointmentId = parseInt(appointmentId);
      }
    }

    const [review] = await db.insert(patientReviews).values({
      reviewerName: reviewerName?.trim() || "Anonymous",
      reviewerEmail: reviewerEmail?.trim() || null,
      rating: parseInt(rating),
      title: title?.trim() || null,
      body: reviewBody.trim(),
      treatmentDate: treatmentDate ? new Date(treatmentDate) : null,
      isVerified: !!verifiedAppointmentId,
      isApproved: false,
    }).returning();

    return NextResponse.json({ review, verified: !!verifiedAppointmentId }, { status: 201 });
  } catch (err) {
    console.error("Verified review error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}