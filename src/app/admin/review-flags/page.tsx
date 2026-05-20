import { db } from "@/lib/db";
import { reviewFlags, patientReviews } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { ReviewFlagsTable } from "./table";

export const dynamic = "force-dynamic";

export default async function ReviewFlagsPage() {
  await requireAuth();

  let flags: Array<{
    id: number;
    reviewId: number;
    reason: string;
    details: string | null;
    reporterEmail: string | null;
    ipAddress: string | null;
    status: string;
    createdAt: Date;
    reviewerName: string | null;
    reviewRating: number | null;
    reviewBody: string | null;
    reviewIsApproved: boolean | null;
    doctorId: number | null;
    hospitalId: number | null;
  }> = [];

  try {
    flags = await db
      .select({
        id: reviewFlags.id,
        reviewId: reviewFlags.reviewId,
        reason: reviewFlags.reason,
        details: reviewFlags.details,
        reporterEmail: reviewFlags.reporterEmail,
        ipAddress: reviewFlags.ipAddress,
        status: reviewFlags.status,
        createdAt: reviewFlags.createdAt,
        reviewerName: patientReviews.reviewerName,
        reviewRating: patientReviews.rating,
        reviewBody: patientReviews.body,
        reviewIsApproved: patientReviews.isApproved,
        doctorId: patientReviews.doctorId,
        hospitalId: patientReviews.hospitalId,
      })
      .from(reviewFlags)
      .leftJoin(patientReviews, eq(patientReviews.id, reviewFlags.reviewId))
      .orderBy(desc(reviewFlags.createdAt))
      .limit(200);
  } catch (err) {
    console.warn("review flags table not yet migrated:", err);
  }

  const pending = flags.filter((f) => f.status === "pending").length;
  const dismissed = flags.filter((f) => f.status === "dismissed").length;
  const upheld = flags.filter((f) => f.status === "upheld").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Review flags</h1>
        <p className="text-sm text-gray-500 mt-1">
          Patient-submitted reports of suspicious, incorrect, or offensive reviews. Upheld flags unpublish the review.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Pending" value={pending} tone="amber" />
        <Stat label="Upheld" value={upheld} tone="red" />
        <Stat label="Dismissed" value={dismissed} tone="green" />
      </div>

      {flags.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-sm text-gray-500">
          No review flags yet. (If the table hasn&apos;t been migrated, run <code className="font-mono">npm run db:migrate</code>.)
        </div>
      ) : (
        <ReviewFlagsTable flags={flags} />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "amber" | "red" | "green" }) {
  const tones = {
    amber: { bg: "bg-amber-50", fg: "text-amber-900" },
    red: { bg: "bg-red-50", fg: "text-red-900" },
    green: { bg: "bg-emerald-50", fg: "text-emerald-900" },
  }[tone];
  return (
    <div className={`${tones.bg} rounded-xl p-4`}>
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${tones.fg} mt-1`}>{value}</div>
    </div>
  );
}
