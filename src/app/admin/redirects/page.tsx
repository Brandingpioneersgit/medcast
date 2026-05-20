import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { desc, sql, count } from "drizzle-orm";
import { ArrowRightLeft, AlertCircle } from "lucide-react";
import { AdminPageHeader, StatRibbon } from "@/components/admin";
import { RedirectForm } from "./redirect-form";
import { RedirectsTableClient } from "./table-client";

export const dynamic = "force-dynamic";

const ROW_LIMIT = 2000;

export default async function RedirectsPage() {
  await requireAuth();

  const [rows, stats] = await Promise.all([
    db
      .select()
      .from(redirects)
      .orderBy(desc(redirects.createdAt))
      .limit(ROW_LIMIT),
    db
      .select({
        total: count(),
        permanent: sql<number>`COUNT(*) FILTER (WHERE ${redirects.statusCode} = 301)::int`,
        temporary: sql<number>`COUNT(*) FILTER (WHERE ${redirects.statusCode} = 302)::int`,
        totalHits: sql<number>`COALESCE(SUM(${redirects.hitCount}), 0)::int`,
      })
      .from(redirects)
      .then((r) => r[0]),
  ]);

  const truncated = stats.total > ROW_LIMIT;

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Redirects"
        subtitle="Permanent URL rewrites for hospital merges, slug renames, and deprecated routes. Paths are locale-agnostic — middleware matches them across all 8 locales."
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "301 (permanent)", value: stats.permanent.toLocaleString() },
              { label: "302 (temporary)", value: stats.temporary.toLocaleString() },
              { label: "Total hits", value: stats.totalHits.toLocaleString(), tone: "success" },
            ]}
          />
        }
      />

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add redirect</h2>
            <p className="text-xs text-gray-500 mt-0.5">Locale-prefix is stripped before lookup. Query strings are preserved.</p>
          </div>
        </div>
        <RedirectForm />
      </section>

      {truncated && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Showing latest {ROW_LIMIT.toLocaleString()} of {stats.total.toLocaleString()} redirects.</strong>{" "}
            Older entries aren't on this page — search within the visible rows or contact the engineer to enable server pagination.
          </div>
        </div>
      )}

      <RedirectsTableClient rows={rows} />
    </div>
  );
}
