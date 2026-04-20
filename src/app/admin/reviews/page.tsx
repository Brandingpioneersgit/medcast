import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { patientReviews, doctors, hospitals } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Star } from "lucide-react";
import { ReviewModerationButtons } from "@/components/admin/review-moderation-buttons";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAuth();

  const rows = await db
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
    .orderBy(desc(patientReviews.createdAt));

  const pending = rows.filter((r) => !r.isApproved).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">{pending} awaiting moderation</p>
        </div>
      </div>

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
