/**
 * Read helpers for the admin audit log.
 *
 * Pair with the existing `recordAudit()` writer in `src/lib/audit.ts`.
 * Designed for the `/admin/audit-log` UI.
 */
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { desc, eq, and, gte, sql } from "drizzle-orm";

export interface AuditQuery {
  /** Filter by action prefix, e.g. "hospital." for all hospital ops */
  actionPrefix?: string;
  /** Filter by exact entity */
  entityType?: string;
  entityId?: number;
  /** Filter by actor email */
  actor?: string;
  /** Only events newer than this date */
  since?: Date;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 50;

export async function queryAuditLog(opts: AuditQuery = {}) {
  const page = opts.page ?? 1;
  const pageSize = Math.min(opts.pageSize ?? DEFAULT_PAGE_SIZE, 200);
  const offset = (page - 1) * pageSize;

  const conds = [];
  if (opts.actionPrefix) {
    conds.push(sql`${auditLog.action} LIKE ${opts.actionPrefix + "%"}`);
  }
  if (opts.entityType) conds.push(eq(auditLog.entityType, opts.entityType));
  if (opts.entityId) conds.push(eq(auditLog.entityId, opts.entityId));
  if (opts.actor) conds.push(eq(auditLog.actor, opts.actor));
  if (opts.since) conds.push(gte(auditLog.createdAt, opts.since));

  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { rows, page, pageSize };
}

/**
 * Activity feed for a specific entity — used by the entity-detail admin
 * page sidebar ("who edited this hospital, when").
 */
export async function recentActionsForEntity(
  entityType: string,
  entityId: number,
  limit = 10,
) {
  return db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
