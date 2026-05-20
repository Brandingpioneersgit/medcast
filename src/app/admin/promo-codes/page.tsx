import { db } from "@/lib/db";
import { promoCodes } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PromoCodesPage() {
  await requireAuth();

  let rows: Array<typeof promoCodes.$inferSelect> = [];
  try {
    rows = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt)).limit(200);
  } catch (err) {
    console.warn("promo_codes not yet migrated:", err);
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Promo codes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create codes via the API or directly in the DB. Validated live via <code className="font-mono">/api/v1/promo-validate</code>.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-sm text-gray-500">
          No promo codes yet. Run <code className="font-mono">npm run db:migrate</code> first.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Used / Max</Th>
                <Th>Valid</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expired = r.validUntil ? now > r.validUntil.getTime() : false;
                const notYet = r.validFrom ? now < r.validFrom.getTime() : false;
                const used = (r.usesCount ?? 0);
                const maxed = r.maxUses != null && used >= r.maxUses;
                const status = !r.isActive
                  ? { label: "Inactive", cls: "bg-gray-100 text-gray-600" }
                  : expired
                  ? { label: "Expired", cls: "bg-red-100 text-red-800" }
                  : notYet
                  ? { label: "Scheduled", cls: "bg-amber-100 text-amber-800" }
                  : maxed
                  ? { label: "Redeemed", cls: "bg-blue-100 text-blue-800" }
                  : { label: "Active", cls: "bg-emerald-100 text-emerald-800" };
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <Td>
                      <code className="font-mono font-medium">{r.code}</code>
                      {r.description && <div className="text-xs text-gray-500 mt-0.5">{r.description}</div>}
                    </Td>
                    <Td>
                      {r.discountType === "percent"
                        ? `${Number(r.discountValue)}%`
                        : `$${Number(r.discountValue).toLocaleString()}`}
                      {r.minOrderUsd && (
                        <div className="text-xs text-gray-500 mt-0.5">Min ${Number(r.minOrderUsd).toLocaleString()}</div>
                      )}
                    </Td>
                    <Td className="tabular-nums">
                      {used} / {r.maxUses ?? "∞"}
                    </Td>
                    <Td className="text-xs text-gray-500">
                      {r.validFrom ? new Date(r.validFrom).toLocaleDateString() : "—"}
                      {" → "}
                      {r.validUntil ? new Date(r.validUntil).toLocaleDateString() : "∞"}
                    </Td>
                    <Td>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </Td>
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
