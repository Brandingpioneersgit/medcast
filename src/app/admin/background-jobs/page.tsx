import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";
import { desc, count, sql, and, eq } from "drizzle-orm";
import { AdminPageHeader, StatRibbon, AdminPagination } from "@/components/admin";
import { JobsFilterBar } from "./filter-bar";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  running: "bg-sky-50 text-sky-700 border-sky-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export default async function BackgroundJobsPage({ searchParams }: PageProps) {
  await requireAuth();
  const sp = await searchParams;
  const status = sp.status ?? "";
  const type = (sp.type ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const conds = [];
  if (status) conds.push(eq(backgroundJobs.status, status));
  if (type) conds.push(eq(backgroundJobs.type, type));
  const whereClause = conds.length > 0 ? and(...conds) : undefined;

  const [rows, matchingCount, stats, typeOptions] = await Promise.all([
    db
      .select()
      .from(backgroundJobs)
      .where(whereClause)
      .orderBy(desc(backgroundJobs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(backgroundJobs).where(whereClause).then((r) => r[0]?.n ?? 0),
    db
      .select({
        total: count(),
        pending: sql<number>`COUNT(*) FILTER (WHERE ${backgroundJobs.status} = 'pending')::int`,
        running: sql<number>`COUNT(*) FILTER (WHERE ${backgroundJobs.status} = 'running')::int`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${backgroundJobs.status} = 'failed')::int`,
      })
      .from(backgroundJobs)
      .then((r) => r[0]),
    db
      .select({ type: backgroundJobs.type, n: count() })
      .from(backgroundJobs)
      .groupBy(backgroundJobs.type)
      .orderBy(desc(count())),
  ]);

  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader
        title="Background jobs"
        subtitle="Async work queue — translations, follow-up emails, scraping, etc. Failed jobs need attention."
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "Pending", value: stats.pending.toLocaleString(), tone: stats.pending > 50 ? "warn" : "default" },
              { label: "Running", value: stats.running.toLocaleString() },
              { label: "Failed", value: stats.failed.toLocaleString(), tone: stats.failed > 0 ? "danger" : "success" },
            ]}
          />
        }
      />

      <JobsFilterBar
        types={typeOptions.map((t) => ({ value: t.type, count: Number(t.n) }))}
        totalRows={stats.total}
        matchingRows={matchingCount}
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          <Briefcase className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-700">
            {stats.total === 0 ? "No background jobs yet" : "No jobs match these filters"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.total === 0
              ? "Async work (translations, follow-up emails, scraping) will queue here once jobs are scheduled."
              : "Try clearing filters or check the schedule."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Attempts</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last error</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_TONE[j.status] ?? STATUS_TONE.pending}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{j.type}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-600">
                    {j.attempts}/{j.maxAttempts}
                    {j.attempts >= j.maxAttempts && j.status === "failed" && (
                      <span className="ml-1.5 text-[10px] text-red-600">max</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                    {new Date(j.scheduledFor).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-[280px] truncate" title={j.lastError ?? ""}>
                    {j.lastError ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">
                    {new Date(j.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalRows={matchingCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
