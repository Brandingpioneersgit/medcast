import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { patientReviews, doctors, hospitals } from "@/lib/db/schema";
import { desc, eq, sql, count } from "drizzle-orm";
import { Star, AlertCircle } from "lucide-react";
import { ReviewModerationButtons } from "@/components/admin/review-moderation-buttons";

export const dynamic = "force-dynamic";

const ROW_LIMIT = 1000;

export default async function AdminReviewsPage() {
  await requireAuth();

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: patientReviews.id,
        reviewerName: patientReviews.reviewerName,
        reviewerCountry: patientReviews.reviewerCountry,
        rating: patientReviews.rating,
        title: patientReviews.title,
        body: patientReviews.body,
        isApproved: patientReviews.isApproved,
        isVerified: patientReviews.isVerified,
        createdAt: patientReviews.createdAt,
        doctorName: doctors.name,
        hospitalName: hospitals.name,
      })
      .from(patientReviews)
      .leftJoin(doctors, eq(patientReviews.doctorId, doctors.id))
      .leftJoin(hospitals, eq(patientReviews.hospitalId, hospitals.id))
      .orderBy(desc(patientReviews.createdAt))
      .limit(ROW_LIMIT),
    db
      .select({
        total: count(),
        pending: sql<number>`COUNT(*) FILTER (WHERE ${patientReviews.isApproved} = false)::int`,
      })
      .from(patientReviews)
      .then((r) => r[0]),
  ]);

  const pending = totals.pending;
  const truncated = totals.total > ROW_LIMIT;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">
            {totals.total.toLocaleString()} total · {pending} awaiting moderation
          </p>
        </div>
      </div>

      {truncated && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Showing latest {ROW_LIMIT.toLocaleString()} of {totals.total.toLocaleString()} reviews.</strong>{" "}
            Older reviews beyond {ROW_LIMIT.toLocaleString()} aren't on this page.
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          <p className="text-sm">No reviews yet. New patient reviews will appear here for moderation.</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className={`bg-white border rounded-xl p-5 ${r.isApproved ? "border-emerald-200" : "border-amber-200"}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900 text-sm">{r.reviewerName} {r.reviewerCountry && <span className="text-xs text-gray-400">· {r.reviewerCountry}</span>}</p>
                <p className="text-xs text-gray-500">
                  {r.doctorName && `Dr. ${r.doctorName}`}
                  {r.doctorName && r.hospitalName && " · "}
                  {r.hospitalName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                  ))}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.isApproved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {r.isApproved ? "Approved" : "Pending"}
                </span>
              </div>
            </div>
            {r.title && <p className="font-semibold text-sm text-gray-900 mb-1">{r.title}</p>}
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{r.body}</p>
            <ReviewModerationButtons id={r.id} isApproved={r.isApproved ?? false} isVerified={r.isVerified ?? false} />
          </div>
        ))}
      </div>
    </div>
  );
}
