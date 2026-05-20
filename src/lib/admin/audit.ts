// Admin-side audit helpers built on top of the canonical `@/lib/audit`
// recorder. Adds two ergonomics on top of the base `recordAudit`:
//   - `recordAdminAudit` accepts a session-shaped first arg so admin route
//     handlers don't have to thread `actor: session.email` themselves.
//   - `withAudit` runs a write closure and logs after success, computing
//     a tiny field-level diff when given before/after snapshots.
//
// All audit writes go through the same `audit_log` table either way, so
// `/admin/audit-log` shows everything regardless of which entry point was
// used.

import { recordAudit as recordAuditBase } from "@/lib/audit";

type Session = { email: string; role: string } | null | undefined;

type Snapshot = Record<string, unknown>;

export type AdminAuditMeta = {
  entityType?: string;
  entityId?: number | null;
  /** Snapshot before the write (optional). */
  before?: Snapshot | null;
  /** Snapshot after the write (optional). When paired with `before`, we compute a tiny diff. */
  after?: Snapshot | null;
  /** Free-form diff text — overrides automatic before/after diff. */
  diff?: string;
  /** Original Request object (used to capture x-forwarded-for). */
  request?: Request | null;
};

function fieldDiff(
  before: Snapshot | null | undefined,
  after: Snapshot | null | undefined
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  if (!before && !after) return out;
  if (!before) {
    for (const [k, v] of Object.entries(after ?? {})) {
      out[k] = { from: null, to: v };
    }
    return out;
  }
  if (!after) {
    for (const [k, v] of Object.entries(before)) {
      out[k] = { from: v, to: null };
    }
    return out;
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const a = before[k];
    const b = after[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out[k] = { from: a, to: b };
    }
  }
  return out;
}

/** Audit one admin action. Failures swallowed (mirrors @/lib/audit). */
export async function recordAudit(
  session: Session,
  action: string,
  meta: AdminAuditMeta = {}
): Promise<void> {
  let diffText = meta.diff;
  if (!diffText && (meta.before !== undefined || meta.after !== undefined)) {
    const d = fieldDiff(meta.before ?? null, meta.after ?? null);
    if (Object.keys(d).length > 0) {
      diffText = JSON.stringify(d);
    }
  }
  await recordAuditBase({
    actor: session?.email ?? null,
    action,
    entityType: meta.entityType ?? null,
    entityId: meta.entityId ?? null,
    diff: diffText ?? null,
    request: meta.request ?? null,
  });
}

/**
 * Run a write closure and audit it afterwards.
 * The closure's return value is passed through unchanged.
 * Audit-log failures are never re-thrown.
 */
export async function withAudit<T>(
  session: Session,
  action: string,
  meta: AdminAuditMeta,
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn();
  void recordAudit(session, action, meta);
  return result;
}
