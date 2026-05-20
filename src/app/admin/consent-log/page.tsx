import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { consentLog } from "@/lib/db/schema";
import { desc, count, and, eq, ilike, or } from "drizzle-orm";
import { AdminPageHeader, StatRibbon, AdminPagination } from "@/components/admin";
import { ConsentFilterBar } from "./filter-bar";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ purpose?: string; q?: string; page?: string }>;
}

const PURPOSE_TONE: Record<string, string> = {
  marketing: "bg-violet-50 text-violet-700",
  analytics: "bg-sky-50 text-sky-700",
  functional: "bg-gray-100 text-gray-700",
  inquiry: "bg-emerald-50 text-emerald-700",
  newsletter: "bg-amber-50 text-amber-700",
};

export default async function ConsentLogPage({ searchParams }: PageProps) {
  await requireAuth();
  const sp = await searchParams;
  const purpose = sp.purpose ?? "";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const conds = [];
  if (purpose) conds.push(eq(consentLog.purpose, purpose));
  if (q) {
    conds.push(or(ilike(consentLog.identifier, `%${q}%`), ilike(consentLog.sourcePage, `%${q}%`))!);
  }
  const whereClause = conds.length > 0 ? and(...conds) : undefined;

  const [rows, matchingCount, stats, purposeOptions] = await Promise.all([
    db
      .select()
      .from(consentLog)
      .where(whereClause)
      .orderBy(desc(consentLog.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(consentLog).where(whereClause).then((r) => r[0]?.n ?? 0),
    db
      .select({ total: count() })
      .from(consentLog)
      .then((r) => r[0]),
    db
      .select({ purpose: consentLog.purpose, n: count() })
      .from(consentLog)
      .groupBy(consentLog.purpose)
      .orderBy(desc(count())),
  ]);

  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader
        title="Consent log"
        subtitle="GDPR-grade record of every consent given on the public site. Each row is a legal artefact — never delete, only export."
        stats={
          <StatRibbon
            items={[
              { label: "Total consents", value: stats.total.toLocaleString() },
              { label: "Distinct purposes", value: purposeOptions.length.toLocaleString() },
            ]}
          />
        }
      />

      <ConsentFilterBar
        purposes={purposeOptions.map((p) => ({ value: p.purpose, count: Number(p.n) }))}
        totalRows={stats.total}
        matchingRows={matchingCount}
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          <Shield className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-700">
            {stats.total === 0 ? "No consents recorded yet" : "No consents match these filters"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.total === 0
              ? "Consents from the cookie banner and form-submission flows will appear here."
              : "Try clearing filters or widening the date range."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Identifier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Locale</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Policy</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PURPOSE_TONE[r.purpose] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.purpose}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono truncate max-w-[240px]" title={r.identifier ?? ""}>
                    {r.identifier ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[260px]" title={r.sourcePage ?? ""}>
                    {r.sourcePage ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase">{r.locale ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.policyVersion}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 tabular-nums whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString()}
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
