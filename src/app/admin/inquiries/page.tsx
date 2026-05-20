import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactInquiries } from "@/lib/db/schema";
import { desc, sql, count } from "drizzle-orm";
import { AdminPageHeader, StatRibbon } from "@/components/admin";
import { AlertCircle } from "lucide-react";
import { InquiriesTableClient } from "./table-client";

export const dynamic = "force-dynamic";

// 2,000 covers ~6 months of leads at moderate volume. The DataTable below is
// purely client-side, so larger scales should switch to a server-paginated
// pattern (see /admin/hospitals for the template).
const ROW_LIMIT = 2000;

export default async function InquiriesAdminPage() {
  await requireAuth();

  const [inquiries, stats] = await Promise.all([
    db
      .select()
      .from(contactInquiries)
      .orderBy(desc(contactInquiries.createdAt))
      .limit(ROW_LIMIT),
    db
      .select({
        total: count(),
        new: sql<number>`COUNT(*) FILTER (WHERE ${contactInquiries.status} = 'new')::int`,
        contacted: sql<number>`COUNT(*) FILTER (WHERE ${contactInquiries.status} = 'contacted')::int`,
        converted: sql<number>`COUNT(*) FILTER (WHERE ${contactInquiries.status} = 'converted')::int`,
        breaching: sql<number>`COUNT(*) FILTER (WHERE ${contactInquiries.status} = 'new' AND ${contactInquiries.createdAt} < NOW() - INTERVAL '1 hour')::int`,
      })
      .from(contactInquiries)
      .then((r) => r[0]),
  ]);

  const truncated = stats.total > ROW_LIMIT;

  return (
    <div>
      <AdminPageHeader
        title="Inquiries"
        subtitle="Patient quote and second-opinion requests. New inquiries should be triaged within 1 hour during business hours."
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "New", value: stats.new.toLocaleString(), tone: stats.new > 0 ? "warn" : "success" },
              { label: "Breaching SLA", value: stats.breaching.toLocaleString(), tone: stats.breaching > 0 ? "danger" : "success", sub: ">1hr in 'new'" },
              { label: "Converted", value: stats.converted.toLocaleString(), tone: "success" },
            ]}
          />
        }
      />
      {truncated && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Showing latest {ROW_LIMIT.toLocaleString()} of {stats.total.toLocaleString()} inquiries.</strong>{" "}
            Older inquiries beyond {ROW_LIMIT.toLocaleString()} are not visible — filter by status or use CSV export to access them, or contact the engineer to switch this list to server-paginated mode.
          </div>
        </div>
      )}
      <InquiriesTableClient rows={inquiries} />
    </div>
  );
}
