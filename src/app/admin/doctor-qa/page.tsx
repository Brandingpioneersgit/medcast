import { db } from "@/lib/db";
import { doctorQa, doctors, specialties } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { AnswerQueue } from "./queue";

export const dynamic = "force-dynamic";

export default async function AdminDoctorQaPage() {
  await requireAuth();

  let rows: Array<{
    id: number;
    slug: string;
    doctorId: number | null;
    doctorName: string | null;
    specialtyId: number | null;
    specialtyName: string | null;
    askerName: string | null;
    askerCountry: string | null;
    askerEmail: string | null;
    question: string;
    answer: string | null;
    answeredAt: Date | null;
    answeredBy: string | null;
    status: string;
    createdAt: Date;
  }> = [];

  try {
    rows = await db
      .select({
        id: doctorQa.id,
        slug: doctorQa.slug,
        doctorId: doctorQa.doctorId,
        doctorName: doctors.name,
        specialtyId: doctorQa.specialtyId,
        specialtyName: specialties.name,
        askerName: doctorQa.askerName,
        askerCountry: doctorQa.askerCountry,
        askerEmail: doctorQa.askerEmail,
        question: doctorQa.question,
        answer: doctorQa.answer,
        answeredAt: doctorQa.answeredAt,
        answeredBy: doctorQa.answeredBy,
        status: doctorQa.status,
        createdAt: doctorQa.createdAt,
      })
      .from(doctorQa)
      .leftJoin(doctors, eq(doctors.id, doctorQa.doctorId))
      .leftJoin(specialties, eq(specialties.id, doctorQa.specialtyId))
      .orderBy(desc(doctorQa.createdAt))
      .limit(200);
  } catch (err) {
    console.warn("doctor_qa not yet migrated:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Doctor Q&amp;A</h1>
        <p className="text-sm text-gray-500 mt-1">
          Patient-submitted questions. Answer + publish to generate QAPage schema markup and surface on /qa.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-sm text-gray-500">
          No questions yet. Run <code className="font-mono">npm run db:migrate</code> first.
        </div>
      ) : (
        <AnswerQueue rows={rows} />
      )}
    </div>
  );
}
