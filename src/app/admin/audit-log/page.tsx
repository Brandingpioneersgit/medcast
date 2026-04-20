import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requireAuth();

  let rows: Array<typeof auditLog.$inferSelect> = [];
  try {
    rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(200);
  } catch (err) {
    console.warn("audit_log not yet migrated:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Last {rows.length} admin actions. Run <code className="font-mono">npm run db:migrate</code> if empty.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-sm text-gray-500">
          No audit entries yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                  <Td className="font-medium">{r.actor ?? "—"}</Td>
                  <Td>
                    <code className="font-mono text-xs bg-gray-50 px-1.5 py-0.5 rounded">
                      {r.action}
                    </code>
                  </Td>
                  <Td>
                    {r.entityType ? (
                      <>
                        {r.entityType}
                        {r.entityId != null && <> #{r.entityId}</>}
                      </>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="text-gray-500 max-w-xl">
                    {r.diff && (
                      <details className="text-xs">
                        <summary className="cursor-pointer">view diff</summary>
                        <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                          {safePretty(r.diff)}
                        </pre>
                      </details>
                    )}
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
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

function safePretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
