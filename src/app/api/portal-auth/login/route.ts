import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createPortalSession } from "@/lib/auth/portal";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, email } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.code, normalizedCode),
    });

    if (!appt) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    if (
      appt.patientEmail &&
      appt.patientEmail.toLowerCase() !== normalizedEmail
    ) {
      return NextResponse.json({ error: "Email does not match our records" }, { status: 401 });
    }

    await createPortalSession(appt.id, appt.patientEmail || normalizedEmail);

    const locale = req.nextUrl.searchParams.get("locale") || "en";
    return NextResponse.redirect(new URL(`/${locale}/portal/${normalizedCode}`, req.url));
  } catch (err) {
    console.error("[portal-auth/login]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
