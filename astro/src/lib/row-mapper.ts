/**
 * Convert a Postgres row (snake_case keys) to a typed JS object
 * (camelCase keys). Used for `db.execute<T>(sql\`...\`)` results where
 * Drizzle's typed query builder isn't expressive enough and we drop down
 * to raw SQL.
 *
 * Usage:
 *   const rows = await db.execute<DoctorRow>(sql`SELECT ...`);
 *   const out = mapRows(rows, [
 *     "id", "name", "slug",
 *     ["image_url", "imageUrl"],
 *     ["experience_years", "experienceYears"],
 *   ]);
 *
 * Each spec is either a string (key is identical in both shapes) or
 * `[snakeKey, camelKey]`. Returning a value of `undefined` for missing
 * fields is intentional — matches Drizzle's behaviour and keeps the type
 * narrowing predictable.
 */

export type FieldSpec = string | readonly [string, string];

export function mapRow<T = Record<string, unknown>>(
  row: Record<string, unknown>,
  spec: readonly FieldSpec[],
): T {
  const out: Record<string, unknown> = {};
  for (const f of spec) {
    if (typeof f === "string") {
      out[f] = row[f];
    } else {
      out[f[1]] = row[f[0]];
    }
  }
  return out as T;
}

export function mapRows<T = Record<string, unknown>>(
  rows: Iterable<Record<string, unknown>>,
  spec: readonly FieldSpec[],
): T[] {
  const out: T[] = [];
  for (const r of rows) out.push(mapRow<T>(r, spec));
  return out;
}

/**
 * Generic snake → camel converter. Useful when you want every column
 * remapped automatically. Less safe than the explicit spec form (no type
 * narrowing) — prefer `mapRow` when the column set is known.
 */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function autoCamel<T = Record<string, unknown>>(
  rows: Iterable<Record<string, unknown>>,
): T[] {
  const out: T[] = [];
  for (const r of rows) {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) o[snakeToCamel(k)] = v;
    out.push(o as T);
  }
  return out;
}
