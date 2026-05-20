import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conditions } from "@/lib/db/schema";
import { desc, count } from "drizzle-orm";
import { ConditionsTable } from "@/components/admin/conditions-table";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const ROW_LIMIT = 1000;

export default async function ConditionsAdminPage() {
  await requireAuth();

  const [allConditions, totals] = await Promise.all([
    db
      .select()
      .from(conditions)
      .orderBy(desc(conditions.name))
      .limit(ROW_LIMIT),
    db.select({ n: count() }).from(conditions).then((r) => r[0]?.n ?? 0),
  ]);

  const truncated = totals > ROW_LIMIT;

  return (
    <div>
      {truncated && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Showing {ROW_LIMIT.toLocaleString()} of {totals.toLocaleString()} conditions.</strong>{" "}
            Older conditions aren't on this page — search uses only the visible rows.
          </div>
        </div>
      )}
      <ConditionsTable initial={allConditions} />
    </div>
  );
}
