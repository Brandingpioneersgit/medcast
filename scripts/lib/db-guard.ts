/**
 * Localhost-DB guard for import / migration scripts.
 *
 * The local embedded Postgres lives on `127.0.0.1:5432`; production sits on
 * a Supabase host. A long-running import accidentally pointed at localhost
 * silently writes to the wrong database (we found this happens once a
 * quarter — usually after a `.env` swap).
 *
 * Usage:
 *   import { assertNonLocalDb } from "../lib/db-guard";
 *   const url = assertNonLocalDb(process.env.DATABASE_URL, { script: __filename });
 *
 * Pass `--local` on the CLI when you really do want to run against the
 * embedded DB (the seeder + migration applier are the legit cases).
 */
export function assertNonLocalDb(
  rawUrl: string | undefined,
  opts: { script?: string } = {},
): string {
  if (!rawUrl) {
    throw new Error(
      `[db-guard] DATABASE_URL is not set. ${opts.script ? `Script: ${opts.script}` : ""}`,
    );
  }
  const wantsLocal =
    process.argv.includes("--local") ||
    process.env.DB_GUARD_ALLOW_LOCAL === "1";

  let host = "";
  try {
    host = new URL(rawUrl).hostname;
  } catch {
    // postgres:// URLs with embedded passwords sometimes fail URL parsing
    // when the password contains unencoded chars; pull the host manually.
    const match = rawUrl.match(/@([^:/?]+)/);
    host = match?.[1] ?? "";
  }
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local");

  if (isLocal && !wantsLocal) {
    throw new Error(
      `[db-guard] Refusing to run against local DB host "${host}". ` +
        `Pass --local (or set DB_GUARD_ALLOW_LOCAL=1) if this is intentional. ` +
        `${opts.script ? `Script: ${opts.script}` : ""}`,
    );
  }
  return rawUrl;
}
