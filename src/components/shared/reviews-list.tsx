import { db } from "@/lib/db";
import { patientReviews } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { Star, CheckCircle } from "lucide-react";
import { ReviewReportButton } from "@/components/shared/review-report-button";

interface Props {
  doctorId?: number;
  hospitalId?: number;
  limit?: number;
}

export async function ReviewsList({ doctorId, hospitalId, limit = 6 }: Props) {
  const conds = [eq(patientReviews.isApproved, true)];
  if (doctorId) conds.push(eq(patientReviews.doctorId, doctorId));
  if (hospitalId) conds.push(eq(patientReviews.hospitalId, hospitalId));

  const reviews = await db.select().from(patientReviews)
    .where(and(...conds))
    .orderBy(desc(patientReviews.createdAt))
    .limit(limit);

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-ink-subtle">
        No reviews yet. Be the first to share your experience.
      </p>
    );
  }

  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className="w-4 h-4"
              style={
                s <= Math.round(avg)
                  ? { fill: "var(--color-saffron)", color: "var(--color-saffron)" }
                  : { color: "var(--color-mist)" }
              }
            />
          ))}
        </div>
        <span className="text-sm font-semibold tnum text-ink">
          {avg.toFixed(1)}
        </span>
        <span className="text-sm text-ink-subtle">
          · {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="paper p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium flex items-center gap-1.5 text-sm text-ink">
                  {r.reviewerName}
                  {r.isVerified && (
                    <CheckCircle
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--color-success)" }}
                    />
                  )}
                </p>
                {r.reviewerCountry && (
                  <p className="text-xs text-ink-subtle">{r.reviewerCountry}</p>
                )}
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="w-3.5 h-3.5"
                    style={
                      s <= r.rating
                        ? { fill: "var(--color-saffron)", color: "var(--color-saffron)" }
                        : { color: "var(--color-mist)" }
                    }
                  />
                ))}
              </div>
            </div>
            {r.title && (
              <p className="font-semibold text-sm mb-1 text-ink">{r.title}</p>
            )}
            <p className="text-sm whitespace-pre-wrap text-ink">{r.body}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-ink-subtle">
                {new Date(r.createdAt).toLocaleDateString()}
              </p>
              <ReviewReportButton reviewId={r.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
