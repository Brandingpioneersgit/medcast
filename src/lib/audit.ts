import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type AuditInput = {
  actor?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  diff?: string | null;
  request?: Request | null;
};

function clientIp(req: Request | null | undefined): string | null {
  if (!req) return null;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  return real ? real.trim() : null;
}

/**
 * Best-effort admin audit trail. Swallows errors so a missing
 * audit_log table (pre-migration) never blocks the primary write.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actor: input.actor ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      diff: input.diff ?? null,
      ipAddress: clientIp(input.request),
    });
  } catch (err) {
    console.warn("[audit] record failed (non-blocking):", err);
  }
}
