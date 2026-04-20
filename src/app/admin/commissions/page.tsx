import { db } from "@/lib/db";
import { commissions, hospitals } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  await requireAuth();

  let rows: Array<{
    id: number;
    hospitalName: string | null;
    inquiryId: number | null;
    appointmentId: number | null;
    amountUsd: string;
    percent: string | null;
    status: string;
    notes: string | null;
    settledAt: Date | null;
    createdAt: Date;
  }> = [];
  let totals = { pending: 0, approved: 0, paid: 0 };

  try {
    rows = await db
      .select({
        id: commissions.id,
        hospitalName: hospitals.name,
        inquiryId: commissions.inquiryId,
        appointmentId: commissions.appointmentId,
        amountUsd: commissions.amountUsd,
        percent: commissions.percent,
        status: commissions.status,
        notes: commissions.notes,
        settledAt: commissions.settledAt,
        createdAt: commissions.createdAt,
      })
      .from(commissions)
      .leftJoin(hospitals, eq(hospitals.id, commissions.hospitalId))
      .orderBy(desc(commissions.createdAt))
      .limit(200);

    const sumRows = await db.execute<{ status: string; total: string }>(sql`
      SELECT status, COALESCE(SUM(amount_usd), 0)::text AS total
      FROM ${commissions}
      GROUP BY status
    `);
    for (const r of Array.from(sumRows)) {
      const key = r.status as keyof typeof totals;
      if (key in totals) totals[key] = Number(r.total);
    }
  } catch (err) {
    console.warn("commissions not yet migrated:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Commission ledger</h1>
        <p className="text-sm text-gray-500 mt-1">
          Read-only ledger. Insert rows via seed / backend job; settle via DB update.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Pending" value={totals.pending} tone="amber" />
        <Stat label="Approved" value={totals.approved} tone="blue" />
        <Stat label="Paid" value={totals.paid} tone="green" />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-sm text-gray-500">
          No commissions recorded. Run <code className="font-mono">npm run db:migrate</code> first.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th>Created</Th>
                <Th>Hospital</Th>
                <Th>Source</Th>
                <Th>Amount</Th>
                <Th>%</Th>
                <Th>Status</Th>
                <Th>Settled</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <Td className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</Td>
                  <Td className="font-medium">{r.hospitalName ?? "—"}</Td>
                  <Td className="text-xs text-gray-500">
                    {r.inquiryId ? `inquiry#${r.inquiryId}` : ""}
                    {r.appointmentId ? ` appt#${r.appointmentId}` : ""}
                    {!r.inquiryId && !r.appointmentId && "—"}
                  </Td>
                  <Td className="tabular-nums font-medium">${Number(r.amountUsd).toLocaleString()}</Td>
                  <Td className="tabular-nums">{r.percent ? `${Number(r.percent)}%` : "—"}</Td>
                  <Td>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "paid"
                          ? "bg-emerald-100 text-emerald-900"
                          : r.status === "approved"
                          ? "bg-blue-100 text-blue-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {r.status}
                    </span>
                  </Td>
                  <Td className="text-xs text-gray-500">
                    {r.settledAt ? new Date(r.settledAt).toLocaleDateString() : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "green" }) {
  const tones = {
    amber: { bg: "bg-amber-50", fg: "text-amber-900" },
    blue: { bg: "bg-blue-50", fg: "text-blue-900" },
    green: { bg: "bg-emerald-50", fg: "text-emerald-900" },
  }[tone];
  return (
    <div className={`${tones.bg} rounded-xl p-4`}>
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${tones.fg} mt-1 tabular-nums`}>
        ${value.toLocaleString()}
      </div>
    </div>
  );
}
