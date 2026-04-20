import { db } from "@/lib/db";
import { priceHistory, hospitalTreatments, hospitals, treatments } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PriceHistoryPage() {
  await requireAuth();

  let rows: Array<{
    id: number;
    hospitalTreatmentId: number;
    costMinUsd: string | null;
    costMaxUsd: string | null;
    prevCostMinUsd: string | null;
    prevCostMaxUsd: string | null;
    changedBy: string | null;
    recordedAt: Date;
    hospitalName: string | null;
    treatmentName: string | null;
  }> = [];

  try {
    rows = await db
      .select({
        id: priceHistory.id,
        hospitalTreatmentId: priceHistory.hospitalTreatmentId,
        costMinUsd: priceHistory.costMinUsd,
        costMaxUsd: priceHistory.costMaxUsd,
        prevCostMinUsd: priceHistory.prevCostMinUsd,
        prevCostMaxUsd: priceHistory.prevCostMaxUsd,
        changedBy: priceHistory.changedBy,
        recordedAt: priceHistory.recordedAt,
        hospitalName: hospitals.name,
        treatmentName: treatments.name,
      })
      .from(priceHistory)
      .innerJoin(hospitalTreatments, eq(hospitalTreatments.id, priceHistory.hospitalTreatmentId))
      .leftJoin(hospitals, eq(hospitals.id, hospitalTreatments.hospitalId))
      .leftJoin(treatments, eq(treatments.id, hospitalTreatments.treatmentId))
      .orderBy(desc(priceHistory.recordedAt))
      .limit(200);
  } catch (err) {
    console.warn("price_history not yet migrated:", err);
  }

  const drops = rows.filter((r) => r.prevCostMinUsd && r.costMinUsd && Number(r.costMinUsd) < Number(r.prevCostMinUsd));
  const hikes = rows.filter((r) => r.prevCostMinUsd && r.costMinUsd && Number(r.costMinUsd) > Number(r.prevCostMinUsd));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Price history</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automatically recorded on every change. Drops trigger emails to patients subscribed via{" "}
          <code className="font-mono">/api/v1/price-watch</code>.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Changes" value={rows.length} tone="gray" />
        <Stat label="Drops" value={drops.length} tone="green" />
        <Stat label="Hikes" value={hikes.length} tone="red" />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-sm text-gray-500">
          No price changes recorded yet. Run <code className="font-mono">npm run db:migrate</code> first.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th>When</Th>
                <Th>Hospital · Treatment</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th>Change</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const from = Number(r.prevCostMinUsd ?? 0);
                const to = Number(r.costMinUsd ?? 0);
                const delta = from > 0 ? Math.round(((to - from) / from) * 100) : null;
                const deltaClass =
                  delta == null
                    ? "bg-gray-100 text-gray-600"
                    : delta < 0
                    ? "bg-emerald-50 text-emerald-900"
                    : delta > 0
                    ? "bg-red-50 text-red-900"
                    : "bg-gray-100 text-gray-600";
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <Td className="text-xs text-gray-500">{new Date(r.recordedAt).toLocaleString()}</Td>
                    <Td className="font-medium">
                      {r.hospitalName ?? "—"}
                      <div className="text-xs text-gray-500">{r.treatmentName ?? "—"}</div>
                    </Td>
                    <Td className="tabular-nums">
                      {r.prevCostMinUsd ? `$${Number(r.prevCostMinUsd).toLocaleString()}` : "—"}
                    </Td>
                    <Td className="tabular-nums font-medium">
                      {r.costMinUsd ? `$${Number(r.costMinUsd).toLocaleString()}` : "—"}
                    </Td>
                    <Td>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium tabular-nums ${deltaClass}`}>
                        {delta == null ? "new" : `${delta > 0 ? "+" : ""}${delta}%`}
                      </span>
                    </Td>
                    <Td className="text-xs text-gray-500">{r.changedBy ?? "—"}</Td>
                  </tr>
                );
              })}
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

function Stat({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "gray" }) {
  const tones = {
    green: { bg: "bg-emerald-50", fg: "text-emerald-900" },
    red: { bg: "bg-red-50", fg: "text-red-900" },
    gray: { bg: "bg-gray-50", fg: "text-gray-900" },
  }[tone];
  return (
    <div className={`${tones.bg} rounded-xl p-4`}>
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${tones.fg} mt-1 tabular-nums`}>{value.toLocaleString()}</div>
    </div>
  );
}
