/**
 * Migration drift check.
 *
 * Confirms that the tables + columns flagged as "needs migrate" are
 * actually present on the live DB. Run after pulling latest schema
 * or before a deploy:
 *
 *   node --env-file=.env.local --import tsx scripts/verify-migrations.ts
 *
 * Exits 0 when every check passes, 1 with a summary otherwise.
 */
import postgres from "postgres";
import { assertNonLocalDb } from "./lib/db-guard";

const url = assertNonLocalDb(process.env.DATABASE_URL, { script: "verify-migrations" });
const sql = postgres(url, { ssl: "require", max: 1 });

type Check =
  | { kind: "table"; name: string }
  | { kind: "column"; table: string; column: string };

const CHECKS: Check[] = [
  { kind: "table", name: "appointments" },
  { kind: "table", name: "patient_reviews" },
  { kind: "table", name: "background_jobs" },
  { kind: "table", name: "redirects" },
  { kind: "table", name: "audit_log" },
  { kind: "table", name: "qa_posts" },
  { kind: "table", name: "glossary_terms" },
  { kind: "table", name: "visa_info" },
  { kind: "column", table: "doctors", column: "cal_url" },
  { kind: "column", table: "redirects", column: "hit_count" },
];

async function tableExists(name: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

const missing: string[] = [];
for (const c of CHECKS) {
  const ok = c.kind === "table" ? await tableExists(c.name) : await columnExists(c.table, c.column);
  const label = c.kind === "table" ? `table ${c.name}` : `column ${c.table}.${c.column}`;
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    console.log(`MISS  ${label}`);
    missing.push(label);
  }
}

await sql.end({ timeout: 5 });

if (missing.length > 0) {
  console.error(`\nMigration drift: ${missing.length} object(s) missing.`);
  console.error("Run `npm run db:migrate` (or apply the corresponding SQL) before deploy.");
  process.exit(1);
} else {
  console.log("\nAll migration checks passed.");
}
