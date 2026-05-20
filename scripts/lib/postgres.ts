/**
 * Guarded `postgres` client factory for import / migration scripts.
 *
 * Drop-in replacement for `import postgres from "postgres"` — same call
 * signature, same return type, but refuses to connect to a localhost host
 * unless `--local` is on the CLI (or `DB_GUARD_ALLOW_LOCAL=1` in env).
 *
 * Why: long-running import scripts accidentally pointed at the embedded
 * dev DB silently write to the wrong place. The guard is a one-line trip-
 * wire; intentional local runs still work via the documented opt-out.
 *
 * Usage:
 *   import postgres from "../lib/postgres";          // from scripts/import/*.ts
 *   import postgres from "./lib/postgres";           // from scripts/*.ts
 *   const sql = postgres(process.env.DATABASE_URL);  // url type is now optional
 */
import postgres from "postgres";
import type { Options, Sql } from "postgres";
import { assertNonLocalDb } from "./db-guard";

function guarded(url: string | undefined, opts?: Options<Record<string, never>>): Sql {
  const safe = assertNonLocalDb(url);
  return opts ? postgres(safe, opts) : postgres(safe);
}

export default guarded;
export type { Sql, Options };
