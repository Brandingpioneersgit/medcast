import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { testimonials, hospitals } from "@/lib/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { AdminPageHeader, StatRibbon } from "@/components/admin";
import { AlertCircle } from "lucide-react";
import { TestimonialsTableClient } from "./table-client";

export const dynamic = "force-dynamic";

const ROW_LIMIT = 1000;

export default async function TestimonialsAdminPage() {
  await requireAuth();

  const [rows, stats] = await Promise.all([
    db
      .select({
        id: testimonials.id,
        patientName: testimonials.patientName,
        patientCountry: testimonials.patientCountry,
        patientAge: testimonials.patientAge,
        rating: testimonials.rating,
        title: testimonials.title,
        story: testimonials.story,
        isVerified: testimonials.isVerified,
        isFeatured: testimonials.isFeatured,
        isActive: testimonials.isActive,
        createdAt: testimonials.createdAt,
        hospitalName: hospitals.name,
        hospitalSlug: hospitals.slug,
      })
      .from(testimonials)
      .leftJoin(hospitals, eq(testimonials.hospitalId, hospitals.id))
      .orderBy(desc(testimonials.createdAt))
      .limit(ROW_LIMIT),
    db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${testimonials.isActive} = true)::int`,
        verified: sql<number>`COUNT(*) FILTER (WHERE ${testimonials.isVerified} = true)::int`,
        featured: sql<number>`COUNT(*) FILTER (WHERE ${testimonials.isFeatured} = true)::int`,
      })
      .from(testimonials)
      .then((r) => r[0]),
  ]);

  const truncated = stats.total > ROW_LIMIT;

  return (
    <div>
      <AdminPageHeader
        title="Testimonials"
        subtitle="Patient stories shown across the site. Verified testimonials carry a checkmark; only active rows render publicly."
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "Active", value: stats.active.toLocaleString(), tone: "success" },
              { label: "Verified", value: stats.verified.toLocaleString() },
              { label: "Featured", value: stats.featured.toLocaleString() },
            ]}
          />
        }
      />
      {truncated && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Showing latest {ROW_LIMIT.toLocaleString()} of {stats.total.toLocaleString()} testimonials.</strong>{" "}
            Older entries aren't on this page.
          </div>
        </div>
      )}
      <TestimonialsTableClient rows={rows} />
    </div>
  );
}
