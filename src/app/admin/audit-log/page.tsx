import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { AdminPageHeader, StatRibbon } from "@/components/admin";
import { AuditLogTableClient } from "./table-client";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requireAuth();

  type Row = typeof auditLog.$inferSelect;
  let rows: Row[] = [];
  let stats = { total: 0, last24h: 0, actors: 0 };

  try {
    const [r, s] = await Promise.all([
      db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(500),
      db
        .select({
          total: sql<number>`count(*)::int`,
          last24h: sql<number>`COUNT(*) FILTER (WHERE ${auditLog.createdAt} > NOW() - INTERVAL '24 hours')::int`,
          actors: sql<number>`COUNT(DISTINCT ${auditLog.actor})::int`,
        })
        .from(auditLog)
        .then((x) => x[0]),
    ]);
    rows = r;
    stats = s ?? stats;
  } catch (err) {
    console.warn("audit_log not yet migrated:", err);
  }

  return (
    <div>
      <AdminPageHeader
        title="Audit log"
        subtitle="Every admin write — who, when, what changed. Drives accountability and lets us trace bad data back to its source."
        stats={
          <StatRibbon
            items={[
              { label: "Total entries", value: stats.total.toLocaleString() },
              { label: "Last 24h", value: stats.last24h.toLocaleString(), tone: "success" },
              { label: "Distinct actors", value: stats.actors.toLocaleString() },
              {
                label: "Showing",
                value: `Latest ${rows.length.toLocaleString()}`,
                sub: stats.total > rows.length ? `of ${stats.total.toLocaleString()}` : undefined,
              },
            ]}
          />
        }
      />
      <AuditLogTableClient rows={rows} />
    </div>
  );
}
