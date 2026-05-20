// Optimistic-concurrency helpers for admin write paths.
// Goal: when two admins edit the same record, the second save should fail
// fast with a 409 instead of silently overwriting the first admin's changes.
//
// Pattern:
//   1. Client loads the record, captures `updatedAt` and includes it in the
//      submit body as `expectedUpdatedAt`.
//   2. Server calls `assertNotStale(table, id, expectedUpdatedAt)` before
//      writing — throws ConcurrencyError if the row's current updatedAt is
//      newer than what the client saw.
//   3. ConcurrencyError → JSON 409 with the current row attached so the
//      client can show a "this was modified by X · diff" dialog.

import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export class ConcurrencyError extends Error {
  status = 409;
  current: Record<string, any>;
  expected: string | Date;
  constructor(current: Record<string, any>, expected: string | Date) {
    super("Record was modified by another admin since you opened the form.");
    this.current = current;
    this.expected = expected;
  }
}

/**
 * Throws ConcurrencyError if the row's `updated_at` doesn't match the
 * `expectedUpdatedAt` the client submitted. Pass the Drizzle table and the
 * row id; the table must have an `updatedAt` column.
 */
export async function assertNotStale(
  table: any,
  id: number,
  expectedUpdatedAt: string | Date | undefined | null
): Promise<void> {
  if (!expectedUpdatedAt) return; // opt-in — old clients without the header skip the check

  const [row] = await db
    .select()
    .from(table)
    .where(eq(table.id, id))
    .limit(1);

  if (!row) return; // 404 will be handled by the caller; not a concurrency issue

  const expected = new Date(expectedUpdatedAt);
  const current = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);

  // Tolerate sub-second drift from PostgreSQL precision.
  if (current.getTime() - expected.getTime() > 500) {
    throw new ConcurrencyError(row, expectedUpdatedAt);
  }
}

/**
 * Convert a thrown ConcurrencyError into a Response. Anything else re-throws.
 * Drop into your admin route's catch block:
 *
 *   try { ... } catch (err) {
 *     if (err instanceof ConcurrencyError) return concurrencyResponse(err);
 *     throw err;
 *   }
 */
export function concurrencyResponse(err: ConcurrencyError): Response {
  return Response.json(
    {
      error: err.message,
      code: "CONCURRENCY_CONFLICT",
      current: err.current,
      expected: err.expected,
    },
    { status: 409 }
  );
}
